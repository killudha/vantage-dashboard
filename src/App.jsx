import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Project from './components/Project';
import ProjectDetail from './components/ProjectDetail';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('vantage_token');
  return token ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('vantage_token');
  return !token ? children : <Navigate to="/" replace />;
};

const MainContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectStatusFilter, setProjectStatusFilter] = useState('All Statuses');
  // Tab asal sebelum membuka detail proyek, dipakai oleh tombol Kembali
  const [detailOrigin, setDetailOrigin] = useState('projects');

  // State Profile dengan penyimpanan otomatis ke LocalStorage
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('vantage_username') || 'ALDEBARA';
  });
  const [userAvatar, setUserAvatar] = useState(() => {
    return localStorage.getItem('vantage_useravatar') || 'https://via.placeholder.com/40';
  });

  const handleUpdateProfile = (newName, newAvatar) => {
    setUserName(newName);
    setUserAvatar(newAvatar);
    localStorage.setItem('vantage_username', newName);
    localStorage.setItem('vantage_useravatar', newAvatar);
  };

  // Status Sidebar terpusat
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('vantage_sidebar_collapsed') === 'true';
  });

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const nextState = !prev;
      localStorage.setItem('vantage_sidebar_collapsed', nextState);
      return nextState;
    });
  };

  const handleNavigate = (tab, statusFilter = 'All Statuses') => {
    setProjectStatusFilter(statusFilter);
    setActiveTab(tab);
  };

  const handleLogout = () => {
    localStorage.removeItem('vantage_token');
    window.location.href = '/login';
  };

  const handleSelectProject = (project) => {
    if (activeTab !== 'detail') setDetailOrigin(activeTab);
    setSelectedProject(project);
    setActiveTab('detail');
  };

  const handleBackFromDetail = () => {
    setActiveTab(detailOrigin);
  };

  return (
    <div className="app-main">
      {(activeTab === 'overview' || activeTab === 'assistant') && (
        <Dashboard 
          onLogout={handleLogout} 
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onSelectProject={handleSelectProject}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          userName={userName}
          userAvatar={userAvatar}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {activeTab === 'projects' && (
        <Project 
          onLogout={handleLogout} 
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onSelectProject={handleSelectProject}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          initialStatusFilter={projectStatusFilter}
          userName={userName}
          userAvatar={userAvatar}
          onUpdateProfile={handleUpdateProfile}
        />
      )}

      {activeTab === 'detail' && (
        <ProjectDetail 
          onLogout={handleLogout} 
          activeTab={activeTab}
          onNavigate={handleNavigate}
          onBack={handleBackFromDetail}
          project={selectedProject}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          userName={userName}
          userAvatar={userAvatar}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/" element={<PrivateRoute><MainContent /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;