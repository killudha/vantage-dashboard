import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/Dashboard.css';
import { 
  FiGrid, 
  FiFolder, 
  FiMessageSquare,
  FiBell, 
  FiShield, 
  FiClock, 
  FiCheckSquare, 
  FiChevronsLeft,
  FiChevronsRight,
  FiLogOut,
  FiSend,
  FiTrash2
} from 'react-icons/fi';

const DEFAULT_CHAT = [
  {
    id: 1,
    sender: 'bot',
    text: 'Halo! Saya Vantage AI Assistant. Saya siap membantu memberikan informasi seluruh proyek yang ada di website ini. Mau cek proyek apa?',
    time: '15.30'
  }
];

const Dashboard = ({ 
  onLogout, 
  activeTab = 'overview', 
  onNavigate, 
  onSelectProject,
  sidebarCollapsed,
  onToggleSidebar,
  userName,
  userAvatar,
  onUpdateProfile 
}) => {
  // State Modal Profile Edit
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [editAvatar, setEditAvatar] = useState(userAvatar);

  useEffect(() => {
    setEditName(userName);
    setEditAvatar(userAvatar);
  }, [userName, userAvatar]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (onUpdateProfile) {
      onUpdateProfile(editName, editAvatar);
    }
    setIsProfileModalOpen(false);
  };

  // State Data dari Backend
  const [commercialProjects, setCommercialProjects] = useState([]);
  const [nonCommercialProjects, setNonCommercialProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State filter priority & tanggal
  const [commFilter, setCommFilter] = useState('all');
  const [nonCommFilter, setNonCommFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State Notifikasi
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // State Metrics
  const [statsCount, setStatsCount] = useState({
    ongoing: 0,
    delayed: 0,
    dueSoon: 0,
    completed: 0
  });

  // State Chatbot Assistant + LocalStorage Persistence
  const [chatMessages, setChatMessages] = useState(() => {
    const savedChat = localStorage.getItem('vantage_chat_history');
    if (savedChat) {
      try {
        return JSON.parse(savedChat);
      } catch (err) {
        console.error('Gagal membaca riwayat chat:', err);
      }
    }
    return DEFAULT_CHAT;
  });

  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('vantage_chat_history', JSON.stringify(chatMessages));
  }, [chatMessages]);

  useEffect(() => {
    if (activeTab === 'assistant' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  const handleClearChat = () => {
    if (window.confirm('Yakin mau menghapus seluruh riwayat chat?')) {
      setChatMessages(DEFAULT_CHAT);
      localStorage.removeItem('vantage_chat_history');
    }
  };

  const allProjects = [
    ...(commercialProjects || []).map((p) => ({ ...p, category: 'Commercial' })),
    ...(nonCommercialProjects || []).map((p) => ({ ...p, category: 'Non-Commercial' }))
  ];

  const generateBotReply = (query) => {
    const q = String(query || '').toLowerCase().trim();

    const greetings = ['woy', 'hai', 'halo', 'p', 'ping', 'tes', 'pagi', 'siang', 'sore', 'malam', 'hey'];
    if (greetings.some((word) => q === word || q.startsWith(word + ' '))) {
      return `Halo! Ada yang bisa saya bantu?\n\nKamu bisa ketik "daftar proyek" untuk melihat semua proyek yang ada di website, atau langsung ketik nama proyeknya.`;
    }

    if (q.includes('daftar') || q.includes('semua proyek') || q.includes('list project') || q.includes('ada proyek apa')) {
      if (allProjects.length === 0) return 'Saat ini belum ada data proyek yang terdaftar di dalam sistem.';
      
      const projectList = allProjects
        .map((p, idx) => `${idx + 1}. ${p.title || p.projectName || 'Tanpa Nama'} (${p.category}) - [${p.status || 'On Going'}]`)
        .join('\n');

      return `Daftar seluruh proyek di Vantage:\n\n${projectList}\n\nKetik nama proyek untuk melihat detail lengkapnya!`;
    }

    if (q.includes('delayed') || q.includes('terlambat') || q.includes('delay')) {
      const delayed = allProjects.filter((p) => (p.status || '').toLowerCase().includes('delay'));
      if (delayed.length === 0) return 'Tidak ada proyek yang delayed saat ini. Semua berjalan tepat waktu!';
      
      const list = delayed.map((p) => `• ${p.title || p.projectName} (${p.category}) - ${p.priority || '-'}`).join('\n');
      return `Terdapat ${delayed.length} proyek berstatus Delayed:\n${list}`;
    }

    const matchedProject = allProjects.find((p) => {
      const pName = String(p.title || p.projectName || '').toLowerCase();
      return pName && (q.includes(pName) || pName.includes(q));
    });

    if (matchedProject) {
      return `📌 Detail Proyek "${matchedProject.title || matchedProject.projectName}":\n• Kategori: ${matchedProject.category}\n• Status: ${matchedProject.status || 'On Going'}\n• Prioritas: ${matchedProject.priority || '-'}\n• Planned End: ${matchedProject.plannedEnd || matchedProject.due || '-'}\n• PM: ${matchedProject.pm || 'Belum diatur'}`;
    }

    const availableNames = Array.from(new Set(allProjects.map((p) => p.title || p.projectName).filter(Boolean))).join(', ');
    return `Maaf, kata kunci "${query}" tidak ditemukan.\n\nCoba ketik nama proyek yang ada seperti: ${availableNames || 'Disney+'}, atau ketik "daftar proyek".`;
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.');

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: chatInput,
      time: currentTime
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const userQuery = chatInput;
    setChatInput('');

    setTimeout(() => {
      const botReply = generateBotReply(userQuery);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).replace(':', '.')
      };
      setChatMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'GOOD MORNING';
    if (hour >= 12 && hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const token = localStorage.getItem('vantage_token');
      
      if (!token) {
        if (onLogout) onLogout();
        return;
      }

      try {
        let url = 'http://localhost:5000/api/projects';
        if (startDate && endDate) {
          url += `?startDate=${startDate}&endDate=${endDate}`;
        }
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data?.success) {
          const rawData = response.data.data || [];
          
          const formattedData = rawData.map((row, index) => {
            const computed = row.computedStatus || row['Status'] || 'On Going';
            const computedLower = String(computed).toLowerCase();
            
            let statusType = 'ongoing-yellow'; 
            let displayStatus = computed;
            let dueText = null;
            const daysRem = row.daysRemaining !== undefined ? Number(row.daysRemaining) : null;

            if (computedLower === 'delayed') {
              statusType = 'delayed';
              displayStatus = 'On Going'; 
              dueText = (daysRem !== null && daysRem < 0) ? `Delayed for ${Math.abs(daysRem)} days` : 'Delayed';
            } else if (computedLower === 'completed') {
              statusType = 'completed';
            } else if (computedLower === 'due soon' || computedLower === 'on going') {
              if (daysRem !== null && daysRem >= 0 && daysRem <= 10) {
                dueText = `${daysRem} Days Remaining`;
                if (computedLower === 'due soon') statusType = 'ongoing-orange';
              }
            }

            const commColValue = String(
              row['Commercial / Non Commercial?'] || 
              row['Commercial / Non Commercial'] || 
              row['Category'] || 
              row['Type'] || ''
            ).toLowerCase().trim();

            const isNonComm = commColValue.includes('non');

            return {
              id: index,
              projectName: row['Project Name'] || row['Title'] || row['Nama Project'] || 'Disney + Project',
              title: row['Project Name'] || row['Title'] || row['Nama Project'] || 'Disney + Project',
              priority: row['Priority'] || row['priority'] || '1',
              plannedEnd: row['Plan End'] || row['Planned End'] || '28/09/2026',
              actualEnd: row['Actual End'] || '-', 
              status: displayStatus,
              statusType: statusType, 
              due: dueText,
              type: isNonComm ? 'non-commercial' : 'commercial',
              pm: row['PM'] || row['PIC'] || 'AL GANTENG',
              rawData: row
            };
          });

          if (response.data.metrics) {
            setStatsCount({
              ongoing: response.data.metrics.onGoing || 0,
              delayed: response.data.metrics.delayed || 0,
              dueSoon: response.data.metrics.dueSoon || 0,
              completed: response.data.metrics.completed || 0
            });
          }

          const highlightOnly = formattedData.filter(item => {
            const highlightValue = item.rawData['Highlight Project'] || '';
            return highlightValue.toString().toLowerCase() === 'yes';
          });

          setCommercialProjects(highlightOnly.filter(item => item.type === 'commercial'));
          setNonCommercialProjects(highlightOnly.filter(item => item.type === 'non-commercial'));

          generateNotificationsFromData(highlightOnly);
        }
      } catch (err) {
        console.error('Gagal memuat data dari Backend:', err);
        if (err.response?.status === 401 && onLogout) {
          onLogout();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [startDate, endDate, onLogout]);

  const generateNotificationsFromData = (dataList) => {
    if (!dataList || dataList.length === 0) return;
    const criticalProjects = dataList.filter(p => p.statusType === 'ongoing-orange' || p.statusType === 'delayed');
    
    if (criticalProjects.length === 0) {
      setNotifications([{ title: '✅ All Clear', desc: 'Tidak ada project Highlight yang mendekati deadline.' }]);
      return;
    }

    const notifItems = criticalProjects.slice(0, 4).map(p => {
      if (p.statusType === 'delayed') {
        return { title: `🚨 Delayed: ${p.title}`, desc: `${p.title} telah melewati batas Planned End!` };
      }
      return { title: `⏳ Due Soon: ${p.title}`, desc: `Sisa waktu ${p.due} untuk menyelesaikan project.` };
    });

    setNotifications(notifItems);
  };

  const getUniquePriorities = (projectList) => {
    const defaultPriorities = ['1', '2', '3'];
    const dataPriorities = (projectList || []).map(p => p.priority).filter(Boolean);
    return Array.from(new Set([...defaultPriorities, ...dataPriorities])).sort();
  };

  const filteredCommercial = commercialProjects.filter(item => {
    return commFilter === 'all' ? true : item.priority === commFilter;
  });

  const filteredNonCommercial = nonCommercialProjects.filter(item => {
    return nonCommFilter === 'all' ? true : item.priority === nonCommFilter;
  });

  return (
    <div className={`dashboard-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-top-row">
            <div className="sidebar-logo-circle">
              <span className="sidebar-logo-text">VANTAGE</span>
            </div>
            <button 
              className="sidebar-collapse-btn-small" 
              onClick={onToggleSidebar}
              aria-label="Toggle Sidebar"
            >
              {sidebarCollapsed ? <FiChevronsRight size={14} /> : <FiChevronsLeft size={14} />}
            </button>
          </div>
          <hr className="sidebar-divider" />
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('overview')}
          >
            <FiGrid className="menu-icon" />
            <span className="menu-text">Overview</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'projects' || activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('projects', 'All Statuses')}
          >
            <FiFolder className="menu-icon" />
            <span className="menu-text">Projects List</span>
          </button>

          <button 
            className={`menu-item ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => onNavigate && onNavigate('assistant')}
          >
            <FiMessageSquare className="menu-icon" />
            <span className="menu-text">AI Assistant</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <FiLogOut className="logout-icon" />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'assistant' ? (
        /* CHATBOT ASSISTANT VIEW */
        <main className="chatbot-page-container">
          <header className="chatbot-top-header">
            <div style={{ width: '0px' }}></div>

            <div className="chatbot-title-pill">
              <h1>VANTAGE ASSISTANT</h1>
            </div>

            <div className="chatbot-header-right">
              <div 
                className="user-avatar" 
                onClick={() => setIsProfileModalOpen(true)}
                style={{ cursor: 'pointer' }}
                title="Klik untuk Edit Profil"
              >
                <img src={userAvatar} alt="User Profile" />
              </div>
            </div>
          </header>

          <div className="chatbot-card">
            <div className="chatbot-card-header">
              <div>
                <h3>Vantage Assistant</h3>
                <span className="chatbot-status-online">● Online</span>
              </div>
              <button 
                className="chatbot-clear-btn" 
                onClick={handleClearChat}
                title="Hapus Riwayat Chat"
              >
                <FiTrash2 size={18} />
              </button>
            </div>

            <div className="chatbot-message-body">
              {chatMessages.map((msg) => (
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
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                />
                <button className="chatbot-send-btn" onClick={handleSendChatMessage}>
                  <FiSend size={18} />
                </button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* OVERVIEW DASHBOARD VIEW */
        <main className="main-content">
          <header className="dashboard-header">
            <div className="header-left">
              <div className="welcome-text">
                <h1>
                  <span className="text-dark-blue">{getGreeting()} </span>
                  <span className="text-light-blue">{userName}</span>
                </h1>
                <p>Semoga harimu senin terus....</p>
              </div>
            </div>

            <div className="header-right">
              <div className="header-user-row">
                <div className="notification-bell-wrapper">
                  <div 
                    className="notification-bell" 
                    onClick={() => setShowNotifications(!showNotifications)}
                    title="Notifications"
                  >
                    <FiBell className="bell-icon" />
                    <span className="bell-badge">{notifications.length || 0}</span>
                  </div>

                  {showNotifications && (
                    <div className="notification-dropdown">
                      <div className="notification-list">
                        {notifications.map((item, idx) => (
                          <div className="notification-card" key={idx}>
                            <h4 className="notification-title">{item.title}</h4>
                            <p className="notification-desc">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div 
                  className="user-avatar" 
                  onClick={() => setIsProfileModalOpen(true)}
                  style={{ cursor: 'pointer' }}
                  title="Klik untuk Edit Profil"
                >
                  <img src={userAvatar} alt="User Profile" />
                </div>
              </div>
              
              <div className="date-filter-pill">
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                />
                <span className="date-separator">-</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                />
              </div>
            </div>
          </header>

          <section className="stats-grid">
            <div className="stat-card ongoing">
              <div className="stat-card-header">
                <span className="stat-title">On Going Project</span>
                <FiShield className="stat-icon" />
              </div>
              <div className="stat-card-body">
                <span className="stat-value">{loading ? '...' : statsCount.ongoing}</span>
                <button 
                  className="view-all-btn" 
                  onClick={() => onNavigate && onNavigate('projects', 'On Going')}
                >
                  View All
                </button>
              </div>
            </div>

            <div className="stat-card delayed">
              <div className="stat-card-header">
                <span className="stat-title">Delayed Project</span>
                <FiClock className="stat-icon" />
              </div>
              <div className="stat-card-body">
                <span className="stat-value">{loading ? '...' : statsCount.delayed}</span>
                <button 
                  className="view-all-btn" 
                  onClick={() => onNavigate && onNavigate('projects', 'Delayed')}
                >
                  View All
                </button>
              </div>
            </div>

            <div className="stat-card due-soon">
              <div className="stat-card-header">
                <span className="stat-title">Due Soon (10 days)</span>
                <FiClock className="stat-icon" />
              </div>
              <div className="stat-card-body">
                <span className="stat-value">{loading ? '...' : statsCount.dueSoon}</span>
                <button 
                  className="view-all-btn" 
                  onClick={() => onNavigate && onNavigate('projects', 'Due Soon')}
                >
                  View All
                </button>
              </div>
            </div>

            <div className="stat-card completed">
              <div className="stat-card-header">
                <span className="stat-title">Project Completed</span>
                <FiCheckSquare className="stat-icon" />
              </div>
              <div className="stat-card-body">
                <span className="stat-value">{loading ? '...' : statsCount.completed}</span>
                <button 
                  className="view-all-btn" 
                  onClick={() => onNavigate && onNavigate('projects', 'Completed')}
                >
                  View All
                </button>
              </div>
            </div>
          </section>

          <section className="project-health-grid">
            <div className="health-column">
              <div className="column-header">
                <span>Commercial Project Health (Highlight)</span>
                <select 
                  className="filter-select"
                  value={commFilter}
                  onChange={(e) => setCommFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {getUniquePriorities(commercialProjects).map((prio, idx) => (
                    <option key={idx} value={prio}>
                      {prio}
                    </option>
                  ))}
                </select>
              </div>

              <div className="project-list">
                {filteredCommercial.map((item, idx) => (
                  <div 
                    className="project-item-card" 
                    key={idx}
                    onClick={() => onSelectProject && onSelectProject(item)}
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk melihat Detail Project"
                  >
                    <div className="project-info-left">
                      <h3 className="project-name">{item.title}</h3>
                      <div className="project-status-row">
                        <span className={`status-dot ${item.statusType}`}></span>
                        <span className="status-label">Status: {item.status}</span>
                        {item.due && <span className="due-label">{item.due}</span>}
                      </div>
                    </div>

                    <div className="project-info-right">
                      <span className="priority-tag">{item.priority}</span>
                      <div className="date-info">
                        <span>Planned End: {item.plannedEnd}</span>
                        <span>Actual End: {item.actualEnd}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCommercial.length === 0 && !loading && (
                   <p style={{textAlign: 'center', marginTop: '20px', color: '#666'}}>Tidak ada project Highlight komersial.</p>
                )}
              </div>
            </div>

            <div className="health-column">
              <div className="column-header">
                <span>Non Commercial Project Health (Highlight)</span>
                <select 
                  className="filter-select"
                  value={nonCommFilter}
                  onChange={(e) => setNonCommFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  {getUniquePriorities(nonCommercialProjects).map((prio, idx) => (
                    <option key={idx} value={prio}>
                      {prio}
                    </option>
                  ))}
                </select>
              </div>

              <div className="project-list">
                {filteredNonCommercial.map((item, idx) => (
                  <div 
                    className="project-item-card" 
                    key={`non-${idx}`}
                    onClick={() => onSelectProject && onSelectProject(item)}
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk melihat Detail Project"
                  >
                    <div className="project-info-left">
                      <h3 className="project-name">{item.title}</h3>
                      <div className="project-status-row">
                        <span className={`status-dot ${item.statusType}`}></span>
                        <span className="status-label">Status: {item.status}</span>
                        {item.due && <span className="due-label">{item.due}</span>}
                      </div>
                    </div>

                    <div className="project-info-right">
                      <span className="priority-tag">{item.priority}</span>
                      <div className="date-info">
                        <span>Planned End: {item.plannedEnd}</span>
                        <span>Actual End: {item.actualEnd}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredNonCommercial.length === 0 && !loading && (
                   <p style={{textAlign: 'center', marginTop: '20px', color: '#666'}}>Tidak ada project Highlight non-komersial.</p>
                )}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* MODAL EDIT PROFIL */}
      {isProfileModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          zIndex: 2000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '16px',
            width: '320px',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#002C4A', fontWeight: '800', textAlign: 'center' }}>
              Edit Profil User
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <img 
                src={editAvatar} 
                alt="Preview" 
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #496D89' }} 
              />
              <label style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#ffffff',
                backgroundColor: '#496D89',
                padding: '6px 14px',
                borderRadius: '12px',
                cursor: 'pointer'
              }}>
                Unggah Foto Baru
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarFileChange} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4b5563' }}>Username</label>
              <input 
                type="text" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => setIsProfileModalOpen(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleSaveProfile}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#002C4A',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;