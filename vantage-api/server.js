require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const projectRoutes = require('./src/routes/projectRoutes');
const authRoutes = require('./src/routes/authRoutes');
const { verifyToken } = require('./src/middlewares/authMiddleware');
const { getCachedProjects } = require('./src/controllers/projectController');
const { parseDate, processTask, summarizeProjects } = require('./src/services/projectService');

const app = express();
const PORT = process.env.PORT || 5000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Domain frontend yang boleh memanggil API ini (pisahkan dengan koma).
// Atur lewat CORS_ORIGIN di Vercel. Saat lokal, 5173 (dev) dan 4173 (preview) otomatis diizinkan.
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api/projects', projectRoutes);
app.use('/api/auth', authRoutes);

// Model Groq aktif yang mendukung Function Calling.
// Bisa diganti lewat .env (GROQ_MODEL) tanpa ubah kode.
const TARGET_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Batas putaran tool-calling supaya tidak looping tanpa henti
const MAX_TOOL_ROUNDS = 5;

if (require.main === module) {
  groq.models.list()
    .then((res) => {
      console.log('✅ Groq API terhubung. Model aktif:', res.data.map((m) => m.id));
    })
    .catch((err) => {
      console.error('⚠️ Gagal terhubung ke Groq API. Cek GROQ_API_KEY di .env:', err.message);
    });
}

// ============================================================================
// 1. DEKLARASI TOOL
//    Ini "menu" yang ditunjukkan ke AI: nama tool + kapan boleh dipakai.
//    AI sendiri yang memutuskan kapan memanggilnya (itu yang disebut trigger).
// ============================================================================
const tools = [
  {
    type: 'function',
    function: {
      name: 'getDashboardProjects',
      description:
        'Mengambil ringkasan proyek beserta status keseluruhan, phase saat ini, task aktif, progress, next task, kondisi timeline dan daftar task berurutan. ' +
        'Panggil tool ini setiap kali pertanyaan user butuh data proyek.',
      parameters: {
        type: 'object',
        properties: {
          statusFilter: {
            type: 'string',
            enum: ['All', 'Planning', 'On Going', 'Completed', 'Delayed', 'Due Soon'],
            description: 'Filter status proyek. Default "All".'
          }
        }
      }
    }
  }
];

// ============================================================================
// 2. FUNGSI NYATA DI SERVER (yang dijalankan saat AI minta tool)
// ============================================================================

const cleanContextValue = (value) => String(value == null ? '' : value)
  .replace(/\s+/g, ' ')
  .trim();

const formatContextValue = (value) => cleanContextValue(value) || 'not available';

const formatDate = (value) => {
  const dateString = cleanContextValue(value);
  const dayFirstMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (dayFirstMatch && parseDate(dateString)) {
    return `${dayFirstMatch[1].padStart(2, '0')}/${dayFirstMatch[2].padStart(2, '0')}/${dayFirstMatch[3]}`;
  }
  if (isoMatch && parseDate(dateString)) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }
  return formatContextValue(dateString);
};

const formatTaskDates = (task) => {
  const start = formatDate(task['Plan Start']);
  const end = formatDate(task['Plan End']);
  return `${start}-${end}`;
};

const formatTaskName = (task) => formatContextValue(task['Task / Step'] || task.Task);

const formatActiveTask = (task) => {
  const daysRemaining = task.daysRemaining == null
    ? 'not available'
    : `${task.daysRemaining} days`;
  return `${formatTaskName(task)} (PIC: ${formatContextValue(task.PIC)}, ${formatTaskDates(task)}, ${formatContextValue(task.condition)}, ${daysRemaining})`;
};

const formatProjectContext = (project) => {
  const activeTaskText = project.activeTasks.length
    ? project.activeTasks.map(formatActiveTask).join('; ')
    : 'none';
  const nextTaskText = project.nextTask
    ? `${formatTaskName(project.nextTask)} (${formatTaskDates(project.nextTask)})`
    : 'none';
  const taskList = project.tasks.map((task) =>
    `[${task.computedStatus}] ${formatTaskName(task)} (${formatTaskDates(task)})`
  ).join('; ');
  const remarks = Array.from(new Set(project.tasks
    .map((task) => cleanContextValue(task.Remarks || task.Remark))
    .filter(Boolean)))
    .join('; ')
    .replace(/(?:https?:\/\/|www\.)\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
  const lines = [
    `PROJECT: ${formatContextValue(project.projectName)} | PM: ${formatContextValue(project.projectManager)} | Type: ${formatContextValue(project.type)} | Priority: ${formatContextValue(project.priority)} | Highlight: ${formatContextValue(project.highlight)}`,
    `Status: ${project.projectStatus} | Phase: ${formatContextValue(project.currentPhase)} | Progress: ${project.progress.completed}/${project.progress.total} tasks completed`,
    `Active task: ${activeTaskText}`,
    `Next task: ${nextTaskText}`,
    `Timeline condition: ${project.condition || 'n/a (no active task)'}`,
    `Tasks: ${taskList}`
  ];

  if (remarks) lines.push(`Remarks: ${remarks}`);
  return lines.join('\n');
};

async function getNormalizedProjects(statusFilter = 'All') {
  try {
    const rawTasks = await getCachedProjects();
    const projects = summarizeProjects(rawTasks.map(processTask));
    const today = new Date().toLocaleDateString('id-ID');
    const countBy = (status) => projects.filter((project) => project.projectStatus === status).length;
    const projectNamesByStatus = (status) => {
      const names = projects
        .filter((project) => project.projectStatus === status)
        .map((project) => project.projectName);
      return names.length ? names.join(', ') : 'none';
    };
    const delayedCount = projects.filter((project) =>
      project.tasks.some((task) => task.condition === 'Delayed')
    ).length;
    const dueSoonCount = projects.filter((project) =>
      project.tasks.some((task) => task.condition === 'Due Soon')
    ).length;
    const normalizedFilter = String(statusFilter || 'All').trim().toLowerCase();
    let filtered = projects;

    if (normalizedFilter !== 'all') {
      filtered = projects.filter((project) => {
        if (normalizedFilter === 'delayed') {
          return project.tasks.some((task) => task.condition === 'Delayed');
        }
        if (normalizedFilter === 'due soon') {
          return project.tasks.some((task) => task.condition === 'Due Soon');
        }
        return project.projectStatus.toLowerCase() === normalizedFilter;
      });
    }

    return {
      today,
      summary: {
        totalProjects: projects.length,
        delayedCount,
        dueSoonCount,
        ongoingCount: countBy('On Going'),
        planningCount: countBy('Planning'),
        completedCount: countBy('Completed')
      },
      header: [
        `Today: ${today}`,
        `Total projects: ${projects.length}`,
        `Planning: ${countBy('Planning')} | Projects: ${projectNamesByStatus('Planning')}`,
        `On Going: ${countBy('On Going')} | Projects: ${projectNamesByStatus('On Going')}`,
        `Completed: ${countBy('Completed')} | Projects: ${projectNamesByStatus('Completed')}`
      ].join('\n'),
      context: filtered.map(formatProjectContext).join('\n\n') || 'No project data is available.'
    };
  } catch (err) {
    console.error('Error loading AI project context:', err.message);
    return { error: 'Gagal membaca data dari database dashboard.' };
  }
}

// Registry: nama tool -> fungsi yang dijalankan.
// Mau tambah tool baru? Cukup tambah di `tools` di atas + satu entri di sini.
const toolHandlers = {
  getDashboardProjects: (args) => getNormalizedProjects(args.statusFilter || 'All')
};

// ============================================================================
// 3. ENDPOINT CHATBOT
//    Alur: kirim ke AI -> kalau AI minta tool, server jalankan tool ->
//    hasilnya dikirim balik ke AI -> ulangi sampai AI memberi jawaban final.
// ============================================================================
app.post('/api/chat', verifyToken, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, reply: 'Pesan tidak boleh kosong.' });
    }

    const systemPrompt = `You are Vantage AI Assistant for the Vantage Dashboard.
Today's date: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}.

Rules:
1. Use only the data provided by the dashboard tool. If information is missing, say it is not available. Never invent tasks, dates, project details, or PICs.
2. For project-data questions, call 'getDashboardProjects' before answering. Match project names case-insensitively and tolerate minor typos. If multiple projects could match, ask which one.
3. "Planning" means NOT STARTED: work has not begun. Never describe a Planning task or project as in progress, On Going, or being worked on. Keep the status word "Planning"; optionally clarify it in the user's language.
4. OUTPUT FORMAT: PLAIN TEXT ONLY. Never use asterisks (* or **), underscores for emphasis, backticks, # headings, tables, or any other Markdown/HTML syntax. For lists, use "- " at the start of a line or "1." numbering.
5. Layout: first line is a short plain title, then a blank line, then one "Label: value" per line. A blank line may separate groups.
6. For a GENERAL project progress question (for example, "how is project X going?"), answer in this order: project status -> current phase -> active task -> progress (x/y) -> next task -> timeline condition. Translate labels into the user's language. Use this Indonesian layout as a guide:
Progress project <name>

Status: <project status>
Fase: <phase>
Task aktif: <task>
PIC: <PIC>
Jadwal: <plan start> – <plan end>
Progres: <x>/<y> task selesai
Task berikutnya: <task> (<plan start> – <plan end>)
Kondisi timeline: <condition>
If there is no active task, say there is no active task and mention the next task. Keep dates in dd/mm/yyyy format.
7. For a SPECIFIC question (such as whether a task has started, who the PIC is, or when it ends), answer that question directly in the first sentence, then add at most two short relevant context lines. Do not use the general progress template.
8. Active tasks are only tasks whose status is "On Going". If there are none, state that there is no active task right now and mention the next task if available.
9. Use the supplied project header as the source of truth for project counts and project lists by status. Do not recount. If a status list says "none", say no project currently has that status; do not say project data is unavailable.
10. "Planning" is a status, never a phase. The phase is the Phase value from the data.
11. Say "not available" only for a field genuinely missing for that specific project, never as a general fallback.
12. Do not add a closing or footer line, including a statement that data was taken from the dashboard on a date.
13. If any task's Plan End is earlier than its Plan Start, briefly note that the sheet dates look inconsistent; do not correct them.
14. Reply in the user's language. If the tool reports an error or no data, state that directly.`;

    const toPlainText = (reply) => String(reply || '')
      .replace(/(^|\n)[ \t]*[*•] /g, '$1- ')
      .replace(/\*\*|__/g, '')
      .replace(/[*`]/g, '')
      .replace(/(^|\n)[ \t]*#+[ \t]?/g, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Bersihkan history dari frontend: hanya role & content yang valid
    const cleanHistory = (Array.isArray(history) ? history : [])
      .filter((h) => h && ['user', 'assistant'].includes(h.role) && typeof h.content === 'string')
      .map((h) => ({ role: h.role, content: h.content }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...cleanHistory,
      { role: 'user', content: message }
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await groq.chat.completions.create({
        model: TARGET_MODEL,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.2
      });

      const aiMessage = response.choices[0].message;
      const toolCalls = aiMessage.tool_calls;

      // TRIGGER: AI tidak minta tool -> ini jawaban final
      if (!toolCalls || toolCalls.length === 0) {
        return res.json({ success: true, reply: toPlainText(aiMessage.content) });
      }

      // AI minta tool -> simpan permintaannya ke riwayat percakapan
      messages.push({
        role: 'assistant',
        content: aiMessage.content || '',
        tool_calls: toolCalls
      });

      // Jalankan SEMUA tool yang diminta (setiap tool_call_id wajib dijawab)
      for (const toolCall of toolCalls) {
        const name = toolCall.function.name;
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          args = {};
        }

        const handler = toolHandlers[name];
        const result = handler
          ? await handler(args)
          : { error: `Tool '${name}' tidak dikenal.` };

        console.log(`🔧 Tool dipanggil: ${name}`, args);

        // Balikkan hasil ke AI
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      // Lanjut loop: AI akan membaca hasil tool dan menjawab (atau minta tool lagi)
    }

    return res.status(500).json({
      success: false,
      reply: 'AI terlalu lama memproses data. Coba ulangi pertanyaan dengan lebih spesifik.'
    });
  } catch (error) {
    console.error('❌ Error AI Endpoint:', error?.message || error);
    return res.status(500).json({
      success: false,
      reply: `Terjadi kendala pada server AI: ${error?.message || 'Gagal memproses data.'}`
    });
  }
});

app.get('/', (req, res) => {
  res.send('Vantage Backend API running with Groq AI!');
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Vercel mengambil `app` dari sini dan menjalankannya sendiri.
module.exports = app;

// Saat dijalankan langsung (node server.js / nodemon) server tetap menyala seperti biasa.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server nyala di http://localhost:${PORT}`);
  });
}