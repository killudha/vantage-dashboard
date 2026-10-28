import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FiBell, FiSend } from 'react-icons/fi';
import '../styles/Dashboard.css';
import '../styles/ChatbotWidget.css';
import '../styles/ChatbotAnimations.css';

// ---------- Pengaturan kecil (ubah di sini kalau perlu) ----------
const STORAGE_KEY = 'vantage_widget_chat'; // riwayat chat, supaya tidak hilang saat pindah ke halaman detail
const SHOW_SUGGESTIONS = true;             // chip saran di awal percakapan
const MAX_PROJECT_BUTTONS = 4;             // maksimal tombol "Buka detail" per balasan
const MAX_SAVED_MESSAGES = 50;
const OPEN_INTENT = /\b(buka|open|masuk ke|pergi ke|go to)\b/; // kata yang memicu pindah halaman otomatis

// ---------- Helper ----------
const norm = (s) => String(s || '').toLowerCase().trim();
const getName = (p) => p.projectName || p.name || p.title || '';
const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Data dashboard berisi satu baris per task, jadi satu proyek bisa muncul berkali-kali.
const dedupeByName = (list) => {
  const seen = new Set();
  return list.filter((p) => {
    const key = norm(getName(p));
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const isDelayed = (p) => norm(p.statusType) === 'delayed' || norm(p.status).includes('delay');

const makeGreeting = () => ({
  id: 1,
  sender: 'bot',
  text: 'Halo! Saya Vantage AI Assistant. Saya siap membantu memberikan informasi seluruh proyek yang ada di website ini. Mau cek proyek apa?',
  time: nowTime()
});

const loadMessages = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {
    // abaikan, pakai sapaan awal
  }
  return [makeGreeting()];
};

// ---------- Teks bot yang muncul bertahap (hanya untuk balasan baru) ----------
const revealDuration = (text) => Math.min(900, Math.max(350, text.length * 10));

const RevealText = ({ text, animate, onProgress }) => {
  const [shown, setShown] = useState(animate ? 0 : text.length);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setShown(text.length);
      return undefined;
    }
    const steps = Math.max(1, Math.round(revealDuration(text) / 20));
    const chunk = Math.max(1, Math.ceil(text.length / steps));
    let count = 0;
    const id = setInterval(() => {
      count = Math.min(text.length, count + chunk);
      setShown(count);
      if (progressRef.current) progressRef.current();
      if (count >= text.length) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [text, animate]);

  return <>{text.slice(0, shown)}</>;
};

// ---------- Komponen utama ----------
// onSelectProject (opsional): fungsi yang sama dengan yang dipakai Dashboard untuk
// membuka halaman detail, yaitu (project) => { setSelectedProject(project); setTab('detail'); }
const ChatbotWidget = ({
  commercialProjects = [],
  nonCommercialProjects = [],
  onSelectProject
}) => {
  const allProjects = useMemo(
    () => [
      ...commercialProjects.map((p) => ({ ...p, category: 'Commercial' })),
      ...nonCommercialProjects.map((p) => ({ ...p, category: 'Non-Commercial' }))
    ],
    [commercialProjects, nonCommercialProjects]
  );

  const uniqueProjects = useMemo(() => dedupeByName(allProjects), [allProjects]);

  const projectByName = useMemo(() => {
    const map = new Map();
    uniqueProjects.forEach((p) => map.set(norm(getName(p)), p));
    return map;
  }, [uniqueProjects]);

  const [messages, setMessages] = useState(loadMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [pending, setPending] = useState(0); // jumlah balasan yang sedang "diketik"
  const [sendFx, setSendFx] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const timers = useRef(new Set());
  const idRef = useRef(Date.now());
  const initialCount = useRef(messages.length); // pesan lama tidak ikut dianimasikan

  const nextId = () => {
    idRef.current += 1;
    return idRef.current;
  };

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => pendingTimers.forEach((id) => clearTimeout(id));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pending]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_SAVED_MESSAGES)));
    } catch (e) {
      // penyimpanan penuh atau diblokir: chat tetap jalan tanpa riwayat
    }
  }, [messages]);

  const suggestions = useMemo(() => {
    const list = ['Daftar proyek', 'Proyek yang delayed'];
    if (uniqueProjects[0]) list.push(`Tampilkan ${getName(uniqueProjects[0])}`);
    return list;
  }, [uniqueProjects]);

  // Cari proyek yang disebut di pesan. Nama terpanjang menang,
  // jadi "Vantage" tidak ikut cocok saat user menulis "Vantage AI Chat Bot Project".
  const findProjects = (q) => {
    if (q.length < 3) return [];
    let hits = uniqueProjects.filter((p) => q.includes(norm(getName(p))));
    if (hits.length === 0) hits = uniqueProjects.filter((p) => norm(getName(p)).includes(q));
    return hits.filter(
      (p) => !hits.some((o) => o !== p && norm(getName(o)).includes(norm(getName(p))))
    );
  };

  // Mengembalikan { text, projects, autoOpen }
  const generateBotReply = (query) => {
    const q = norm(query);
    const hint = onSelectProject ? '\n\nKlik tombol di bawah untuk membuka detail proyek.' : '';

    const greetings = ['woy', 'hai', 'halo', 'p', 'ping', 'tes', 'pagi', 'siang', 'sore', 'malam', 'hey'];
    if (greetings.some((word) => q === word || q.startsWith(word + ' '))) {
      return {
        text: `Halo! Ada yang bisa saya bantu?\n\nKamu bisa ketik "daftar proyek" untuk melihat semua proyek yang ada di website, atau langsung ketik nama proyeknya.`,
        projects: []
      };
    }

    if (q.includes('daftar') || q.includes('semua proyek') || q.includes('list project') || q.includes('ada proyek apa')) {
      if (uniqueProjects.length === 0) {
        return { text: 'Saat ini belum ada data proyek yang terdaftar di dalam sistem.', projects: [] };
      }

      const projectList = uniqueProjects
        .map((p, idx) => `${idx + 1}. ${getName(p)} (${p.category}) - [${p.status}]`)
        .join('\n');

      return {
        text: `Daftar seluruh proyek di Vantage:\n\n${projectList}\n\nKetik nama proyek untuk melihat detail lengkapnya!`,
        projects: []
      };
    }

    if (q.includes('delayed') || q.includes('terlambat') || q.includes('delay')) {
      const delayed = dedupeByName(allProjects.filter(isDelayed));
      if (delayed.length === 0) {
        return { text: 'Tidak ada proyek yang delayed saat ini. Semua berjalan tepat waktu!', projects: [] };
      }

      const list = delayed.map((p) => `• ${getName(p)} (${p.category}) - ${p.priority || '-'}`).join('\n');
      return {
        text: `Terdapat ${delayed.length} proyek berstatus Delayed:\n${list}${hint}`,
        projects: delayed.slice(0, MAX_PROJECT_BUTTONS)
      };
    }

    const matches = findProjects(q);

    if (matches.length === 1) {
      const p = matches[0];
      const autoOpen = OPEN_INTENT.test(q) && typeof onSelectProject === 'function';
      const detail = `📌 Detail Proyek "${getName(p)}":\n• Kategori: ${p.category}\n• Status: ${p.status}\n• Prioritas: ${p.priority || '-'}\n• Target End: ${p.plannedEnd || p.due || '-'}\n• PM: ${p.pm || 'Belum diatur'}`;
      return {
        text: autoOpen ? `Oke, saya buka detail proyek "${getName(p)}" sekarang...\n\n${detail}` : `${detail}${hint}`,
        projects: [p],
        autoOpen
      };
    }

    if (matches.length > 1) {
      const list = matches
        .slice(0, MAX_PROJECT_BUTTONS)
        .map((p) => `• ${getName(p)} (${p.category}) - [${p.status}]`)
        .join('\n');
      return {
        text: `Saya menemukan ${matches.length} proyek yang cocok:\n${list}${hint}`,
        projects: matches.slice(0, MAX_PROJECT_BUTTONS)
      };
    }

    const availableNames = uniqueProjects.map(getName).join(', ');
    return {
      text: `Maaf, kata kunci "${query}" tidak ditemukan.\n\nCoba ketik nama proyek yang ada seperti: ${availableNames || 'Disney+'}, atau ketik "daftar proyek".`,
      projects: []
    };
  };

  const sendMessage = (raw) => {
    const text = String(raw || '').trim();
    if (!text) return;

    setMessages((prev) => [...prev, { id: nextId(), sender: 'user', text, time: nowTime() }]);
    setInputMessage('');

    setSendFx(true);
    later(() => setSendFx(false), 600);

    setPending((n) => n + 1);
    const reply = generateBotReply(text);
    const delay = Math.min(1400, 600 + reply.text.length * 3);

    later(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          sender: 'bot',
          text: reply.text,
          time: nowTime(),
          projectNames: reply.projects.map(getName)
        }
      ]);
      setPending((n) => Math.max(0, n - 1));

      if (reply.autoOpen && onSelectProject) {
        later(() => onSelectProject(reply.projects[0]), 1100);
      }
    }, delay);

    if (inputRef.current) inputRef.current.focus();
  };

  const scrollWhileRevealing = () => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  };

  return (
    <main className="chatbot-page-container">
      {/* Header Banner VANTAGE ASSISTANT */}
      <header className="chatbot-top-header">
        <div style={{ width: '0px' }}></div>

        <div className="chatbot-title-pill">
          <h1>VANTAGE ASSISTANT</h1>
        </div>

        <div className="chatbot-header-right">
          <div className="notification-bell">
            <FiBell className="bell-icon" />
            <span className="bell-badge">8</span>
          </div>
          <div className="user-avatar">
            <img src="https://via.placeholder.com/40" alt="User Profile" />
          </div>
        </div>
      </header>

      {/* Card Chatbot Utama */}
      <div className="chatbot-card">
        <div className="chatbot-card-header">
          <h3>Vantage Assistant</h3>
          <span className="chatbot-status-online">● Online</span>
        </div>

        <div className="chatbot-message-body">
          {messages.map((msg, idx) => {
            const isNew = idx >= initialCount.current;
            const isBot = msg.sender === 'bot';
            const projects = (msg.projectNames || [])
              .map((name) => projectByName.get(norm(name)))
              .filter(Boolean);

            return (
              <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
                <div className={`chat-bubble ${msg.sender}${isNew ? ' vantage-anim' : ''}`}>
                  <p>
                    {isBot ? (
                      <RevealText text={msg.text} animate={isNew} onProgress={scrollWhileRevealing} />
                    ) : (
                      msg.text
                    )}
                  </p>

                  {isBot && onSelectProject && projects.length > 0 && (
                    <div
                      className="vantage-actions"
                      style={isNew ? { animationDelay: `${revealDuration(msg.text) + 100}ms` } : undefined}
                    >
                      {projects.map((p) => (
                        <button
                          key={norm(getName(p))}
                          type="button"
                          className="vantage-open-btn"
                          title={`Buka detail ${getName(p)}`}
                          onClick={() => onSelectProject(p)}
                        >
                          Buka detail: {getName(p)}
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="chat-time">{msg.time}</span>
                </div>
              </div>
            );
          })}

          {pending > 0 && (
            <div className="chat-message-row bot">
              <div
                className="chat-bubble bot vantage-anim"
                role="status"
                aria-label="Asisten sedang mengetik"
              >
                <span className="vantage-typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
              </div>
            </div>
          )}

          {SHOW_SUGGESTIONS && messages.length === 1 && pending === 0 && (
            <div className="vantage-chips">
              {suggestions.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className="vantage-chip"
                  style={{ animationDelay: `${300 + i * 90}ms` }}
                  onClick={() => sendMessage(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className="chatbot-input-area">
          <div className="chatbot-input-pill">
            <input
              ref={inputRef}
              type="text"
              placeholder="Tanyakan Pada kami"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
            />
            <button
              type="button"
              className={`chatbot-send-btn${sendFx ? ' is-sending' : ''}`}
              aria-label="Kirim pesan"
              onClick={() => sendMessage(inputMessage)}
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatbotWidget;