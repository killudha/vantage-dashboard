import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Project from './components/Project';
import ProjectDetail from './components/ProjectDetail';

// Komponen Gerbang Proteksi: Tolak user yang belum punya token
const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('vantage_token');
  return token ? children : <Navigate to="/login" replace />;
};

// Komponen Gerbang Publik: Tolak user yang sudah login jika mau buka halaman /login
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('vantage_token');
  return !token ? children : <Navigate to="/" replace />;
};

// Bungkus seluruh logika UI lama Anda ke dalam komponen MainContent
const MainContent = () => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'projects', 'detail'
  const [selectedProject, setSelectedProject] = useState(null);
  
  // State Profile
  const [userName, setUserName] = useState('ALDEBARA');
  const [userAvatar, setUserAvatar] = useState('https://via.placeholder.com/40');

  // Perbaikan handleLogout: Hapus token dan tendang ke halaman login
  const handleLogout = () => {
    localStorage.removeItem('vantage_token');
    window.location.href = '/login';
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActiveTab('detail');
  };

  return (
    <div className="app-main">
      {activeTab === 'overview' && (
        <Dashboard 
          onLogout={handleLogout} 
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectProject={handleSelectProject}
          userName={userName}
          setUserName={setUserName}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
        />
      )}

      {activeTab === 'projects' && (
        <Project 
          onLogout={handleLogout} 
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          onSelectProject={handleSelectProject}
          userName={userName}
          setUserName={setUserName}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
        />
      )}

      {activeTab === 'detail' && (
        <ProjectDetail 
          onLogout={handleLogout} 
          activeTab={activeTab}
          onNavigate={(tab) => setActiveTab(tab)}
          project={selectedProject}
          userName={userName}
          setUserName={setUserName}
          userAvatar={userAvatar}
          setUserAvatar={setUserAvatar}
        />
      )}
    </div>
  );
};

// Komponen Utama App kini bertugas mengatur rute URL
function App() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <MainContent />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;