import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { fetchExcelData } from '../utils/fetchExcel';
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

const SHAREPOINT_LINK = 'https://xlo365-my.sharepoint.com/:x:/g/personal/intr_dhannya_xlsmart_co_id/IQD1GsY01XbVT6XJqFGIcy_vAZn_AcqW4X0m_Og3AgdjiuA?e=HogYEf';

const Dashboard = ({ onLogout, activeTab = 'overview', onNavigate, onSelectProject }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commercialProjects, setCommercialProjects] = useState([]);
  const [nonCommercialProjects, setNonCommercialProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State filter priority
  const [commFilter, setCommFilter] = useState('all');
  const [nonCommFilter, setNonCommFilter] = useState('all');

  // State filter tanggal
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // State Popover Notifikasi
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const [statsCount, setStatsCount] = useState({
    ongoing: 0,
    delayed: 0,
    dueSoon: 0,
    completed: 0
  });

  // Ucapan salam dinamis berdasarkan jam lokal
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'GOOD MORNING';
    if (hour >= 12 && hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  useEffect(() => {
    const loadExcel = async () => {
      setLoading(true);
      try {
        const rawData = await fetchExcelData(SHAREPOINT_LINK);
        
        const formattedData = rawData.map((row, index) => {
          const statusRaw = String(row['Status'] || row['status'] || 'On Going');
          const statusLower = statusRaw.toLowerCase();
          
          let statusType = 'ongoing-yellow';
          if (statusLower.includes('delay')) {
            statusType = 'delayed';
          } else if (statusLower.includes('complet')) {
            statusType = 'completed';
          } else if (statusLower.includes('due') || row['Due'] || row['due']) {
            statusType = 'ongoing-orange';
          }

          const category = String(row['Category'] || row['Type'] || row['type'] || 'commercial').toLowerCase();

          return {
            id: index,
            projectName: row['Project Name'] || row['Title'] || row['Nama Project'] || 'Disney + Project',
            title: row['Project Name'] || row['Title'] || row['Nama Project'] || 'Disney + Project',
            priority: row['Priority'] || row['priority'] || 'PRIORITY 1',
            plannedEnd: row['Planned End'] || row['plannedEnd'] || '28/09/2026',
            actualEnd: row['Actual End'] || row['actualEnd'] || '28/09/2026',
            status: statusRaw,
            statusType: statusType,
            due: row['Due'] || row['due'] || (statusLower.includes('due') ? statusRaw : null),
            type: category.includes('non') ? 'non-commercial' : 'commercial',
            pm: row['PM'] || row['PIC'] || 'AL GANTENG'
          };
        });

        processProjects(formattedData);
        generateNotificationsFromData(formattedData);
      } catch (err) {
        console.error('Gagal memuat data Excel dari link SharePoint:', err);
        const fallbackData = [
          { id: 1, type: 'commercial', title: 'Disney + Project', projectName: 'Disney + Project', priority: 'PRIORITY 1', plannedEnd: '28/09/2026', actualEnd: '1/10/2026', status: 'Delayed [X] Days', statusType: 'delayed', pm: 'AL GANTENG' },
          { id: 2, type: 'commercial', title: 'Disney + Project', projectName: 'Disney + Project', priority: 'PRIORITY 1', plannedEnd: '28/09/2026', actualEnd: '28/09/2026', status: 'On Going', statusType: 'ongoing-orange', due: 'Due in [X] Days', pm: 'AL GANTENG' },
          { id: 3, type: 'commercial', title: 'Disney + Project', projectName: 'Disney + Project', priority: 'PRIORITY 1', plannedEnd: '28/09/2026', actualEnd: '28/09/2026', status: 'On Going', statusType: 'ongoing-yellow', pm: 'AL GANTENG' },
          { id: 4, type: 'commercial', title: 'Disney + Project', projectName: 'Disney + Project', priority: 'PRIORITY 1', plannedEnd: '28/09/2026', actualEnd: '28/09/2026', status: 'Completed', statusType: 'completed', pm: 'AL GANTENG' },
          { id: 5, type: 'commercial', title: 'Disney + Project', projectName: 'Disney + Project', priority: 'PRIORITY 2', plannedEnd: '28/09/2026', actualEnd: '1/10/2026', status: 'Delayed [X] Days', statusType: 'delayed', pm: 'AL GANTENG' },
          { id: 6, type: 'commercial', title: 'Disney + Project', projectName: 'Disney + Project', priority: 'PRIORITY 2', plannedEnd: '28/09/2026', actualEnd: '28/09/2026', status: 'On Going', statusType: 'ongoing-orange', due: 'Due in [X] Days', pm: 'AL GANTENG' },
          { id: 7, type: 'non-commercial', title: 'Disney + Project', projectName: 'Disney + Project', priority: 'PRIORITY 3', plannedEnd: '15/10/2026', actualEnd: '20/10/2026', status: 'On Going', statusType: 'ongoing-yellow', pm: 'AL GANTENG' },
        ];
        processProjects(fallbackData);
        generateNotificationsFromData(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    loadExcel();
  }, []);

  const processProjects = (dataList) => {
    const commercial = dataList.filter(item => item.type === 'commercial');
    const nonCommercial = dataList.filter(item => item.type === 'non-commercial');

    setCommercialProjects(commercial);
    setNonCommercialProjects(nonCommercial.length > 0 ? nonCommercial : commercial);

    const ongoing = dataList.filter(p => p.statusType.includes('ongoing')).length;
    const delayed = dataList.filter(p => p.statusType === 'delayed').length;
    const dueSoon = dataList.filter(p => p.due).length;
    const completed = dataList.filter(p => p.statusType === 'completed').length;

    setStatsCount({ ongoing, delayed, dueSoon, completed });
  };

  const generateNotificationsFromData = (dataList) => {
    if (!dataList || dataList.length === 0) return;

    const p1 = dataList[0]?.title || 'Project XYZ';
    const p2 = dataList[1]?.title || p1;
    const p3 = dataList[2]?.title || p1;

    const notifItems = [
      { title: '⏳ Countdown: 10 Days Left', desc: `Reminder: 10 days left until the planned end date for ${p1}.` },
      { title: '⏳ Countdown: [X] Days Left', desc: `Reminder: Only [X] days left to complete ${p2}.` },
      { title: '📌 Due Today: ' + p2, desc: `Today is the Planned End Date for ${p2}!` },
      { title: '🚨 Overdue: 1 Day Passed', desc: `${p3} is 1 day overdue!` }
    ];

    setNotifications(notifItems);
  };

  const getUniquePriorities = (projectList) => {
    const defaultPriorities = ['PRIORITY 1', 'PRIORITY 2', 'PRIORITY 3'];
    const dataPriorities = projectList.map(p => p.priority).filter(Boolean);
    return Array.from(new Set([...defaultPriorities, ...dataPriorities])).sort();
  };

  const isWithinDateRange = (item) => {
    if (!startDate && !endDate) return true;
    const dateStr = item.plannedEnd || item.actualEnd;
    if (!dateStr) return true;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return true;

    const projectDate = new Date(parts[2], parts[1] - 1, parts[0]);

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (projectDate < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (projectDate > end) return false;
    }

    return true;
  };

  const filteredCommercial = commercialProjects.filter(item => {
    const matchPriority = commFilter === 'all' ? true : item.priority === commFilter;
    return matchPriority && isWithinDateRange(item);
  });

  const filteredNonCommercial = nonCommercialProjects.filter(item => {
    const matchPriority = nonCommFilter === 'all' ? true : item.priority === nonCommFilter;
    return matchPriority && isWithinDateRange(item);
  });

  return (
    <div className={`dashboard-container ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sidebar Area */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo-circle">
            <span className="sidebar-logo-text">VANTAGE</span>
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

      {/* Main Content Area */}
      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <button 
              className="toggle-sidebar-btn" 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Toggle Sidebar"
            >
              {sidebarCollapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
            </button>
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
                  <span className="bell-badge">{notifications.length || 8}</span>
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

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card ongoing">
            <div className="stat-card-header">
              <span className="stat-title">On Going Project</span>
              <FiShield className="stat-icon" />
            </div>
            <div className="stat-card-body">
              <span className="stat-value">{loading ? '...' : statsCount.ongoing}</span>
              <button className="view-all-btn">View All</button>
            </div>
          </div>

          <div className="stat-card delayed">
            <div className="stat-card-header">
              <span className="stat-title">Delayed Project</span>
              <FiClock className="stat-icon" />
            </div>
            <div className="stat-card-body">
              <span className="stat-value">{loading ? '...' : statsCount.delayed}</span>
              <button className="view-all-btn">View All</button>
            </div>
          </div>

          <div className="stat-card due-soon">
            <div className="stat-card-header">
              <span className="stat-title">Due Soon (10 days)</span>
              <FiClock className="stat-icon" />
            </div>
            <div className="stat-card-body">
              <span className="stat-value">{loading ? '...' : statsCount.dueSoon}</span>
              <button className="view-all-btn">View All</button>
            </div>
          </div>

          <div className="stat-card completed">
            <div className="stat-card-header">
              <span className="stat-title">Project Completed</span>
              <FiCheckSquare className="stat-icon" />
            </div>
            <div className="stat-card-body">
              <span className="stat-value">{loading ? '...' : statsCount.completed}</span>
              <button className="view-all-btn">View All</button>
            </div>
          </div>
        </section>

        {/* Health Columns */}
        <section className="project-health-grid">
          <div className="health-column">
            <div className="column-header">
              <span>Commercial Project Health</span>
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
            </div>
          </div>

          <div className="health-column">
            <div className="column-header">
              <span>Non Commercial Project Health</span>
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
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;