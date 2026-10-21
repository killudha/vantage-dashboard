import React, { useState } from 'react';
import '../styles/Dashboard.css';
import '../styles/ProjectDetail.css';
import { 
  FiGrid,
  FiFolder,
  FiBell, 
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronDown,
  FiLogOut
} from 'react-icons/fi';

const ProjectDetail = ({ onLogout, activeTab = 'detail', onNavigate, project }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Mengambil nama project dan PM yang dipilih
  const projectName = project?.projectName || project?.title || 'Disney+';
  const projectPM = project?.pm || 'AL GANTENG';

  // Dummy task data presisi sesuai desain
  const dummyTask = {
    category: 'Back End',
    priority: 'High',
    title: 'UAT',
    desc: 'Finding: ERROR 211 during activation due to...',
    segment: 'GKS',
    planStart: '29/10/2026',
    planEnd: '29/10/2026'
  };

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
      <main className="detail-page-container">
        {/* Header Top */}
        <header className="detail-top-header">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle Sidebar">
            {sidebarCollapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
          </button>

          <div className="detail-title-pill">
            <h1>DETAIL PROJECTS</h1>
          </div>

          <div className="detail-header-right">
            <div className="notification-bell">
              <FiBell className="bell-icon" />
              <span className="bell-badge">8</span>
            </div>
            <div className="user-avatar">
              <img src="https://via.placeholder.com/40" alt="User Profile" />
            </div>
          </div>
        </header>

        {/* Project Name Pill */}
        <div className="project-name-banner">
          <h2>{projectName}</h2>
        </div>

        {/* Sub Header PM */}
        <div className="pm-info-row">
          <span className="pm-label">PM</span>
          <span className="pm-name">{projectPM}</span>
        </div>

        {/* Kanban Board Grid */}
        <section className="kanban-board-grid">
          {/* Column 1: Planning */}
          <div className="kanban-column">
            <div className="column-header-pill">
              <span className="status-tag yellow">Planning</span>
              <span className="count-text">(4)</span>
              <FiChevronDown className="dropdown-chevron" />
            </div>
            <div className="task-list">
              <TaskCard task={dummyTask} />
            </div>
          </div>

          {/* Column 2: On Progress */}
          <div className="kanban-column">
            <div className="column-header-pill">
              <span className="status-tag green">On Progress</span>
              <span className="count-text">(4)</span>
              <FiChevronDown className="dropdown-chevron" />
            </div>
            <div className="task-list">
              <TaskCard task={dummyTask} />
            </div>
          </div>

          {/* Column 3: Delayed */}
          <div className="kanban-column">
            <div className="column-header-pill">
              <span className="status-tag red">Delayed</span>
              <span className="count-text">(4)</span>
              <FiChevronDown className="dropdown-chevron" />
            </div>
            <div className="task-list">
              <TaskCard task={dummyTask} />
              <TaskCard task={dummyTask} />
            </div>
          </div>

          {/* Column 4: Done */}
          <div className="kanban-column">
            <div className="column-header-pill">
              <span className="status-tag blue">Done</span>
              <span className="count-text">(4)</span>
              <FiChevronDown className="dropdown-chevron" />
            </div>
            <div className="task-list">
              <TaskCard task={dummyTask} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// Sub-component untuk Card Task
const TaskCard = ({ task }) => {
  return (
    <div className="kanban-task-card">
      <div className="task-card-top">
        <span className="task-category">{task.category}</span>
        <span className="task-priority">{task.priority}</span>
      </div>

      <div className="task-card-body">
        <div className="red-accent-line"></div>
        <div className="task-main-content">
          <h4 className="task-title">{task.title}</h4>
          <p className="task-desc">
            **{task.desc} <button className="view-specs-btn">View Specs</button>
          </p>
        </div>
      </div>

      <div className="task-card-footer">
        <div className="meta-item">
          <span className="meta-label">Segment</span>
          <span className="meta-val">{task.segment}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Plan Start</span>
          <span className="meta-val">{task.planStart}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Plan End</span>
          <span className="meta-val">{task.planEnd}</span>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;