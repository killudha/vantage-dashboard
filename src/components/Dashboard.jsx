import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Dashboard.css';
import { 
  FiGrid, 
  FiFolder, 
  FiBell, 
  FiShield, 
  FiClock, 
  FiCheckSquare, 
  FiChevronsLeft,
  FiChevronsRight,
  FiLogOut
} from 'react-icons/fi';

const Dashboard = ({ onLogout, activeTab = 'overview', onNavigate, onSelectProject }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
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

  // State Metrics langsung dari Backend
  const [statsCount, setStatsCount] = useState({
    ongoing: 0,
    delayed: 0,
    dueSoon: 0,
    completed: 0
  });

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
        if(onLogout) onLogout();
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

        if (response.data.success) {
            const rawData = response.data.data;
            
            const formattedData = rawData.map((row, index) => {
              const computed = row.computedStatus || row['Status'] || 'On Going';
              const computedLower = computed.toLowerCase();
              
              let statusType = 'ongoing-yellow'; 
              let displayStatus = computed;
              let dueText = null;
              const daysRem = row.daysRemaining !== undefined ? Number(row.daysRemaining) : null;

              if (computedLower === 'delayed') {
                statusType = 'delayed';
                displayStatus = 'On Going'; 
                
                if (daysRem !== null && daysRem < 0) {
                  dueText = `Delayed for ${Math.abs(daysRem)} days`;
                } else {
                  dueText = 'Delayed';
                }
              } else if (computedLower === 'completed') {
                statusType = 'completed';
              } else if (computedLower === 'due soon' || computedLower === 'on going') {
                if (daysRem !== null && daysRem >= 0 && daysRem <= 10) {
                  dueText = `${daysRem} Days Remaining`;
                  if (computedLower === 'due soon') {
                    statusType = 'ongoing-orange';
                  }
                } else {
                  dueText = null;
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
                priority: row['Priority'] || row['priority'] || 'PRIORITY 1',
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

            setStatsCount({
                ongoing: response.data.metrics.onGoing,
                delayed: response.data.metrics.delayed,
                dueSoon: response.data.metrics.dueSoon,
                completed: response.data.metrics.completed
            });

            const highlightOnly = formattedData.filter(item => {
                const highlightValue = item.rawData['Highlight Project'] || '';
                return highlightValue.toString().toLowerCase() === 'yes';
            });

            const commercial = highlightOnly.filter(item => item.type === 'commercial');
            const nonCommercial = highlightOnly.filter(item => item.type === 'non-commercial');
        
            setCommercialProjects(commercial);
            setNonCommercialProjects(nonCommercial);

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
    
    if(criticalProjects.length === 0) {
        setNotifications([{ title: '✅ All Clear', desc: 'Tidak ada project Highlight yang mendekati deadline.' }]);
        return;
    }

    const notifItems = criticalProjects.slice(0, 4).map(p => {
        if(p.statusType === 'delayed') {
            return { title: `🚨 Delayed: ${p.title}`, desc: `${p.title} telah melewati batas Planned End!` };
        } else {
            return { title: `⏳ Due Soon: ${p.title}`, desc: `Sisa waktu ${p.due} untuk menyelesaikan project.` };
        }
    });

    setNotifications(notifItems);
  };

  const getUniquePriorities = (projectList) => {
    const defaultPriorities = ['PRIORITY 1', 'PRIORITY 2', 'PRIORITY 3'];
    const dataPriorities = projectList.map(p => p.priority).filter(Boolean);
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
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-top-row">
            <div className="sidebar-logo-circle">
              <span className="sidebar-logo-text">VANTAGE</span>
            </div>
            <button 
              className="sidebar-collapse-btn-small" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
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
            onClick={() => onNavigate && onNavigate('projects')}
          >
            <FiFolder className="menu-icon" />
            <span className="menu-text">Projects List</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <FiLogOut className="logout-icon" />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <div className="welcome-text">
              <h1>
                <span className="text-dark-blue">{getGreeting()} </span>
                <span className="text-light-blue">ALDEBARA</span>
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

              <div className="user-avatar">
                <img src="https://via.placeholder.com/40" alt="User Profile" />
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
              <button className="view-all-btn" onClick={() => onNavigate && onNavigate('projects')}>View All</button>
            </div>
          </div>

          <div className="stat-card delayed">
            <div className="stat-card-header">
              <span className="stat-title">Delayed Project</span>
              <FiClock className="stat-icon" />
            </div>
            <div className="stat-card-body">
              <span className="stat-value">{loading ? '...' : statsCount.delayed}</span>
              <button className="view-all-btn" onClick={() => onNavigate && onNavigate('projects')}>View All</button>
            </div>
          </div>

          <div className="stat-card due-soon">
            <div className="stat-card-header">
              <span className="stat-title">Due Soon (10 days)</span>
              <FiClock className="stat-icon" />
            </div>
            <div className="stat-card-body">
              <span className="stat-value">{loading ? '...' : statsCount.dueSoon}</span>
              <button className="view-all-btn" onClick={() => onNavigate && onNavigate('projects')}>View All</button>
            </div>
          </div>

          <div className="stat-card completed">
            <div className="stat-card-header">
              <span className="stat-title">Project Completed</span>
              <FiCheckSquare className="stat-icon" />
            </div>
            <div className="stat-card-body">
              <span className="stat-value">{loading ? '...' : statsCount.completed}</span>
              <button className="view-all-btn" onClick={() => onNavigate && onNavigate('projects')}>View All</button>
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
                    {prio.replace(/priority/i, 'Priority')}
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
                    {prio.replace(/priority/i, 'Priority')}
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
    </div>
  );
};

export default Dashboard;