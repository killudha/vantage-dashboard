import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Project from './components/Project';
import ProjectDetail from './components/ProjectDetail';

function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'projects', 'detail'
  const [selectedProject, setSelectedProject] = useState(null);
  
  // State Profile
  const [userName, setUserName] = useState('ALDEBARA');
  const [userAvatar, setUserAvatar] = useState('https://via.placeholder.com/40');

  const handleLogout = () => {
    console.log('Logout');
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
}

export default App;