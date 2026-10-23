import React, { useState, useRef, useEffect } from 'react';
import { FiBell, FiSend } from 'react-icons/fi';
import '../styles/Dashboard.css';
import '../styles/ChatbotWidget.css';

const ChatbotWidget = ({ commercialProjects = [], nonCommercialProjects = [] }) => {
  const allProjects = [
    ...commercialProjects.map((p) => ({ ...p, category: 'Commercial' })),
    ...nonCommercialProjects.map((p) => ({ ...p, category: 'Non-Commercial' }))
  ];

  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Halo! Saya Vantage AI Assistant. Saya siap membantu memberikan informasi seluruh proyek yang ada di website ini. Mau cek proyek apa?',
      time: '15.30'
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateBotReply = (query) => {
    const q = query.toLowerCase().trim();

    const greetings = ['woy', 'hai', 'halo', 'p', 'ping', 'tes', 'pagi', 'siang', 'sore', 'malam', 'hey'];
    if (greetings.some((word) => q === word || q.startsWith(word + ' '))) {
      return `Halo! Ada yang bisa saya bantu?\n\nKamu bisa ketik "daftar proyek" untuk melihat semua proyek yang ada di website, atau langsung ketik nama proyeknya.`;
    }

    if (q.includes('daftar') || q.includes('semua proyek') || q.includes('list project') || q.includes('ada proyek apa')) {
      if (allProjects.length === 0) return 'Saat ini belum ada data proyek yang terdaftar di dalam sistem.';
      
      const projectList = allProjects
        .map((p, idx) => `${idx + 1}. ${p.name || p.title} (${p.category}) - [${p.status}]`)
        .join('\n');

      return `Daftar seluruh proyek di Vantage:\n\n${projectList}\n\nKetik nama proyek untuk melihat detail lengkapnya!`;
    }

    if (q.includes('delayed') || q.includes('terlambat') || q.includes('delay')) {
      const delayed = allProjects.filter((p) => (p.status || '').toLowerCase().includes('delay'));
      if (delayed.length === 0) return 'Tidak ada proyek yang delayed saat ini. Semua berjalan tepat waktu!';
      
      const list = delayed.map((p) => `• ${p.name || p.title} (${p.category}) - ${p.priority || '-'}`).join('\n');
      return `Terdapat ${delayed.length} proyek berstatus Delayed:\n${list}`;
    }

    const matchedProject = allProjects.find(
      (p) => {
        const pName = (p.name || p.title || '').toLowerCase();
        return q.includes(pName) || pName.includes(q);
      }
    );

    if (matchedProject) {
      return `📌 Detail Proyek "${matchedProject.name || matchedProject.title}":\n• Kategori: ${matchedProject.category}\n• Status: ${matchedProject.status}\n• Prioritas: ${matchedProject.priority || '-'}\n• Target End: ${matchedProject.plannedEnd || matchedProject.due || '-'}\n• PM: ${matchedProject.pm || 'Belum diatur'}`;
    }

    const availableNames = Array.from(new Set(allProjects.map((p) => p.name || p.title))).join(', ');
    return `Maaf, kata kunci "${query}" tidak ditemukan.\n\nCoba ketik nama proyek yang ada seperti: ${availableNames || 'Disney+'}, atau ketik "daftar proyek".`;
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputMessage,
      time: currentTime
    };

    setMessages((prev) => [...prev, userMsg]);
    const userQuery = inputMessage;
    setInputMessage('');

    setTimeout(() => {
      const botReply = generateBotReply(userQuery);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.')
      };
      setMessages((prev) => [...prev, botMsg]);
    }, 400);
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
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message-row ${msg.sender}`}>
              <div className={`chat-bubble ${msg.sender}`}>
                <p>{msg.text}</p>
                <span className="chat-time">{msg.time}</span>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chatbot-input-area">
          <div className="chatbot-input-pill">
            <input 
              type="text" 
              placeholder="Tanyakan Pada kami"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="chatbot-send-btn" onClick={handleSendMessage}>
              <FiSend size={18} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ChatbotWidget;