require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

const projectRoutes = require('./src/routes/projectRoutes');
const authRoutes = require('./src/routes/authRoutes');
const projectController = require('./src/controllers/projectController');

const app = express();
const PORT = process.env.PORT || 5000;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

app.use(cors());
app.use(express.json());

app.use('/api/projects', projectRoutes);
app.use('/api/auth', authRoutes);

// Model Groq aktif yang mendukung Function Calling.
// Bisa diganti lewat .env (GROQ_MODEL) tanpa ubah kode.
const TARGET_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

// Batas putaran tool-calling supaya tidak looping tanpa henti
const MAX_TOOL_ROUNDS = 5;
const DUE_SOON_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function parsePlanEndDate(value) {
  if (value == null || String(value).trim() === '') return null;

  const dateString = String(value).trim();
  const dayFirstMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const isoMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  let year;
  let month;
  let day;

  if (dayFirstMatch) {
    day = Number(dayFirstMatch[1]);
    month = Number(dayFirstMatch[2]);
    year = Number(dayFirstMatch[3]);
  } else if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) return null;
    year = parsedDate.getFullYear();
    month = parsedDate.getMonth() + 1;
    day = parsedDate.getDate();
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function getCalendarDayDifference(targetDate, today) {
  const targetUtc = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetUtc - todayUtc) / MILLISECONDS_PER_DAY);
}

groq.models.list()
  .then((res) => {
    console.log('✅ Groq API terhubung. Model aktif:', res.data.map((m) => m.id));
  })
  .catch((err) => {
    console.error('⚠️ Gagal terhubung ke Groq API. Cek GROQ_API_KEY di .env:', err.message);
  });

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
        'Mengambil data real-time proyek unik dari dashboard, termasuk jumlah Delayed, Due Soon, On Going, dan Completed. ' +
        'Delayed dan Due Soon hanya berlaku untuk proyek dengan status asli On Going. ' +
        'Mengembalikan daftar proyek beserta PM/PIC, prioritas, serta tanggal planned/actual end. ' +
        'Panggil tool ini setiap kali pertanyaan user butuh data proyek.',
      parameters: {
        type: 'object',
        properties: {
          statusFilter: {
            type: 'string',
            enum: ['All', 'Delayed', 'Due Soon', 'On Going', 'Completed'],
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

// Memanggil controller Express seolah-olah request biasa, lalu menangkap hasilnya.
function callController(fn) {
  return new Promise((resolve) => {
    let done = false;
    let timer;

    const finish = (data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(data);
    };

    const fakeRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        finish(this.statusCode >= 400 ? null : data);
        return this;
      },
      send(data) {
        finish(this.statusCode >= 400 ? null : data);
        return this;
      }
    };

    timer = setTimeout(() => finish(null), 8000); // jaga-jaga controller tidak pernah merespons

    try {
      Promise.resolve(
        fn({ query: {}, params: {}, body: {}, headers: {} }, fakeRes, () => finish(null))
      ).catch(() => finish(null));
    } catch (e) {
      finish(null);
    }
  });
}

async function getNormalizedProjects(statusFilter = 'All') {
  try {
    const controllerFn = projectController.getProjects;

    if (typeof controllerFn !== 'function') {
      return { error: 'Fungsi controller proyek tidak ditemukan.' };
    }

    let result = await callController(controllerFn);
    if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch (e) { result = null; }
    }
    const rawProjects = Array.isArray(result) ? result : result?.data;

    console.log('📊 Sampel data proyek (maks. 3):',
      Array.isArray(rawProjects) ? rawProjects.slice(0, 3) : rawProjects);

    if (!Array.isArray(rawProjects) || rawProjects.length === 0) {
      return {
        summary: {
          totalProjects: 0,
          delayedCount: 0,
          dueSoonCount: 0,
          ongoingCount: 0,
          completedCount: 0
        },
        projects: []
      };
    }

    const projectsByName = new Map();
    for (const row of rawProjects) {
      const item = row || {};
      const projectName = [item['Project Name'], item['Title'], item.title, item['Nama Project']]
        .map((value) => value == null ? '' : String(value).trim())
        .find(Boolean);
      if (!projectName) continue;

      const projectKey = projectName.replace(/\s+/g, ' ').toLowerCase();
      if (projectsByName.has(projectKey)) projectsByName.delete(projectKey);
      projectsByName.set(projectKey, { item, projectName: projectName.replace(/\s+/g, ' ') });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalized = Array.from(projectsByName.values(), ({ item, projectName }) => {
      const statusValue = item['Status'] ?? item.status;
      const rawStatus = statusValue == null ? '' : String(statusValue).trim();
      const normalizedRawStatus = rawStatus.toLowerCase();
      const plannedEndStr = item['Plan End'] || item['Planned End'] || item.plannedEnd;
      const plannedEndDate = parsePlanEndDate(plannedEndStr);
      let status = rawStatus || 'Unknown';

      if (normalizedRawStatus === 'on going') {
        status = 'On Going';
        if (plannedEndDate) {
          const daysUntilEnd = getCalendarDayDifference(plannedEndDate, today);
          if (daysUntilEnd < 0) {
            status = 'Delayed';
          } else if (daysUntilEnd <= DUE_SOON_DAYS) {
            status = 'Due Soon';
          }
        }
      } else if (normalizedRawStatus === 'completed') {
        status = 'Completed';
      }

      return {
        projectName,
        priority: item['Priority'] || item.priority || '-',
        rawStatus,
        status,
        plannedEnd: plannedEndStr || '-',
        actualEnd: item['Actual End'] || item.actualEnd || '-',
        pm: item['PM'] || item['PIC'] || item.pm || '-'
      };
    });

    console.log('📊 Sampel data proyek unik (maks. 3):', normalized.slice(0, 3));

    const countBy = (value) => normalized.filter(
      (project) => String(project.status).trim().toLowerCase() === value
    ).length;

    let filtered = normalized;
    const normalizedFilter = String(statusFilter || 'All').trim().toLowerCase();
    if (normalizedFilter !== 'all') {
      filtered = normalized.filter((p) => {
        return String(p.status).trim().toLowerCase() === normalizedFilter;
      });
    }

    return {
      summary: {
        totalProjects: normalized.length,
        delayedCount: countBy('delayed'),
        dueSoonCount: countBy('due soon'),
        ongoingCount: countBy('on going'),
        completedCount: countBy('completed')
      },
      projects: filtered
    };
  } catch (err) {
    console.error('Error Tool Execution:', err.message);
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
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, reply: 'Pesan tidak boleh kosong.' });
    }

    const systemPrompt = `Kamu adalah Vantage AI Assistant untuk Dashboard Vantage.
Hari ini: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}.

ATURAN:
1. Jika pertanyaan butuh data proyek (status, statistik, jumlah proyek, daftar PM, dll), kamu WAJIB memanggil tool 'getDashboardProjects' dulu. Jangan menebak atau mengarang data.
2. Status On Going hanya untuk status asli On Going; status asli tetap tersedia sebagai rawStatus.
3. Delayed dan Due Soon hanya berlaku untuk proyek yang rawStatus-nya On Going. Delayed berarti Plan End sudah lewat; Due Soon berarti Plan End hari ini sampai ${DUE_SOON_DAYS} hari ke depan.
4. Proyek hanya masuk satu status hasil: Delayed, Due Soon, On Going, Completed, atau status lainnya. Gunakan summary untuk hitungan dan totalProjects untuk jumlah proyek unik.
5. Jawab berdasarkan data yang dikembalikan tool: langsung, singkat, dan akurat. Jika tool mengembalikan error atau data kosong, sampaikan apa adanya.
6. Jawab dalam Bahasa Indonesia.
7. DILARANG bertanya balik di akhir jawaban.`;

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
        return res.json({ success: true, reply: aiMessage.content || '' });
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

app.listen(PORT, () => {
  console.log(`Server nyala di http://localhost:${PORT}`);
});