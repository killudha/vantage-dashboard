import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Dashboard.css';
import '../styles/Project.css';
import { 
  FiGrid, 
  FiFolder, 
  FiMessageSquare,
  FiBell, 
  FiSearch, 
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut,
  FiFilter,
  FiRotateCcw
} from 'react-icons/fi';

const Project = ({ 
  onLogout, 
  activeTab = 'projects', 
  onNavigate, 
  onSelectProject,
  sidebarCollapsed,
  onToggleSidebar,
  initialStatusFilter = 'All Statuses',
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

  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ambil data filter dari Session Storage jika ada
  const [dateStart, setDateStart] = useState(() => sessionStorage.getItem('vantage_startDate') || '');
  const [dateEnd, setDateEnd] = useState(() => sessionStorage.getItem('vantage_endDate') || '');
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem('vantage_searchQuery') || '');
  
  const [pmList, setPmList] = useState([]);
  const [phaseList, setPhaseList] = useState([]);
  const statusList = ['Planning', 'On Going', 'Completed', 'Delayed', 'Due Soon'];

  const [selectedPm, setSelectedPm] = useState(() => sessionStorage.getItem('vantage_selectedPm') || 'All PM');
  const [selectedPhase, setSelectedPhase] = useState(() => sessionStorage.getItem('vantage_selectedPhase') || 'All Phases');
  const [selectedStatus, setSelectedStatus] = useState(() => {
    // Jika ada klik navigasi spesifik dari Dashboard (misal klik "Delayed")
    if (initialStatusFilter !== 'All Statuses') return initialStatusFilter;
    return sessionStorage.getItem('vantage_selectedStatus') || 'All Statuses';
  });

  // Timpa filter status JIKA user masuk dari tombol klik indikator di Dashboard
  useEffect(() => {
    if (initialStatusFilter !== 'All Statuses') {
      setSelectedStatus(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // Simpan setiap perubahan filter ke dalam Session Storage
  useEffect(() => {
    sessionStorage.setItem('vantage_startDate', dateStart);
    sessionStorage.setItem('vantage_endDate', dateEnd);
    sessionStorage.setItem('vantage_searchQuery', searchQuery);
    sessionStorage.setItem('vantage_selectedPm', selectedPm);
    sessionStorage.setItem('vantage_selectedPhase', selectedPhase);
    sessionStorage.setItem('vantage_selectedStatus', selectedStatus);
  }, [dateStart, dateEnd, searchQuery, selectedPm, selectedPhase, selectedStatus]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchProjectData = async () => {
      setLoading(true);
      const token = localStorage.getItem('vantage_token');
      
      if (!token) {
        if (onLogout) onLogout();
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/api/projects', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          const rawData = response.data.data || [];
          
          const formattedData = rawData.map((row, index) => {
            const pmVal = row['Project Manager'] || row['PM'] || row['PIC'] || row['pic'] || 'AL GANTENG';
            const phaseVal = row['Phase'] || row['phase'] || 'Development';
            const baseStatus = row.computedStatus || row['Status'] || 'On Going';
            const condition = row.condition || 'On Track';
            const statusVal = condition === 'On Track'
              ? baseStatus
              : `${baseStatus} (${condition})`;
            
            return {
              id: index + 1,
              projectName: String(row['Project Name'] || row['Title'] || row['Nama Project'] || 'Disney+'),
              phase: String(phaseVal),
              status: String(statusVal),
              baseStatus: String(baseStatus),
              condition: String(condition),
              planStart: String(row['Plan Start'] || row['plannedStart'] || '-'),
              planEnd: String(row['Plan End'] || row['plannedEnd'] || '-'),
              actualStart: String(row['Actual Start'] || row['actualStart'] || '-'),
              actualEnd: String(row['Actual End'] || row['actualEnd'] || '-'),
              pm: String(pmVal),
              rawData: row 
            };
          });

          const uniquePms = Array.from(new Set(formattedData.map(item => item.pm))).filter(Boolean);
          const uniquePhases = Array.from(new Set(formattedData.map(item => item.phase))).filter(Boolean);

          setPmList(uniquePms);
          setPhaseList(uniquePhases);

          setProjects(formattedData);
          setFilteredProjects(formattedData);
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

    fetchProjectData();
  }, [onLogout]); 

  useEffect(() => {
    let result = [...projects];

    if (searchQuery.trim() !== '') {
      const q = String(searchQuery).toLowerCase();
      result = result.filter(item => 
        String(item.projectName).toLowerCase().includes(q) ||
        String(item.phase).toLowerCase().includes(q) ||
        String(item.status).toLowerCase().includes(q) ||
        String(item.pm).toLowerCase().includes(q)
      );
    }

    if (selectedPm !== 'All PM') {
      result = result.filter(item => String(item.pm).toLowerCase() === String(selectedPm).toLowerCase());
    }

    if (selectedPhase !== 'All Phases') {
      result = result.filter(item => String(item.phase).toLowerCase() === String(selectedPhase).toLowerCase());
    }

    if (selectedStatus !== 'All Statuses') {
      const normalizedSelectedStatus = selectedStatus.toLowerCase();
      if (normalizedSelectedStatus === 'delayed' || normalizedSelectedStatus === 'due soon') {
        result = result.filter(item => item.condition.toLowerCase() === normalizedSelectedStatus);
      } else if (normalizedSelectedStatus === 'on going') {
        result = result.filter(item => ['on going', 'planning'].includes(item.baseStatus.toLowerCase()));
      } else {
        result = result.filter(item => item.baseStatus.toLowerCase() === normalizedSelectedStatus);
      }
    }

    if (dateStart) {
      result = result.filter(item => {
        const strPlanStart = String(item.planStart);
        if (!strPlanStart.includes('/')) return false;
        const parts = strPlanStart.split('/');
        if (parts.length === 3) {
          const itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
          return itemDate >= new Date(dateStart);
        }
        return true;
      });
    }

    if (dateEnd) {
      result = result.filter(item => {
        const strPlanEnd = String(item.planEnd);
        if (!strPlanEnd.includes('/')) return false;
        const parts = strPlanEnd.split('/');
        if (parts.length === 3) {
          const itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
          return itemDate <= new Date(dateEnd);
        }
        return true;
      });
    }

    result.sort((a, b) => {
      const getDateObj = (dateStr) => {
        if (!dateStr || !dateStr.includes('/')) return new Date(0);
        const p = dateStr.split('/');
        return p.length === 3 ? new Date(p[2], p[1] - 1, p[0]) : new Date(0);
      };
      return getDateObj(b.planStart) - getDateObj(a.planStart);
    });

    setFilteredProjects(result);
    setCurrentPage(1);
  }, [searchQuery, dateStart, dateEnd, selectedPm, selectedPhase, selectedStatus, projects]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleResetFilter = () => {
    setSelectedPhase('All Phases');
    setSelectedStatus('All Statuses');
    setSelectedPm('All PM');
    setDateStart('');
    setDateEnd('');
    setSearchQuery('');
    setIsFilterOpen(false);
    
    // Bersihkan sesi
    sessionStorage.removeItem('vantage_startDate');
    sessionStorage.removeItem('vantage_endDate');
    sessionStorage.removeItem('vantage_searchQuery');
    sessionStorage.removeItem('vantage_selectedPm');
    sessionStorage.removeItem('vantage_selectedPhase');
    sessionStorage.removeItem('vantage_selectedStatus');
  };

  const getPaginationRange = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || 
        i === totalPages || 
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

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

      <main className="project-page-container">
        <header className="project-top-header">
          <div style={{ width: '0px' }}></div>

          <div className="project-title-pill">
            <h1>PROJECTS</h1>
          </div>

          <div className="project-header-right">
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

        <section className="project-filter-bar">
          <div className="filter-group">
            <label>Date Start</label>
            <div className="pill-input-wrapper">
              <input 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)}
                className="filter-pill-date"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Date End</label>
            <div className="pill-input-wrapper">
              <input 
                type="date" 
                value={dateEnd} 
                onChange={(e) => setDateEnd(e.target.value)}
                className="filter-pill-date"
              />
            </div>
          </div>

          <div className="filter-group" style={{ position: 'relative' }}>
            <label>Filter</label>
            <button 
              type="button" 
              className="filter-pill-button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <FiFilter style={{ marginRight: '6px' }} /> Advanced Filter ∨
            </button>

            {isFilterOpen && (
              <div className="custom-filter-dropdown" style={{ padding: '12px', width: '240px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff', position: 'absolute', top: '100%', left: 0, zIndex: 100, borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>Phase</label>
                  <select 
                    value={selectedPhase}
                    onChange={(e) => setSelectedPhase(e.target.value)}
                    className="filter-pill-select"
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <option value="All Phases">All Phases</option>
                    {phaseList.map((ph, idx) => (
                      <option key={idx} value={ph}>{ph}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>Status</label>
                  <select 
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="filter-pill-select"
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <option value="All Statuses">All Statuses</option>
                    {statusList.map((st, idx) => (
                      <option key={idx} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#555' }}>PM</label>
                  <select 
                    value={selectedPm}
                    onChange={(e) => setSelectedPm(e.target.value)}
                    className="filter-pill-select"
                    style={{ width: '100%', marginTop: '4px' }}
                  >
                    <option value="All PM">All PM</option>
                    {pmList.map((pmName, idx) => (
                      <option key={idx} value={pmName}>{pmName}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleResetFilter}
                  style={{
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '4px'
                  }}
                >
                  <FiRotateCcw size={12} /> Reset Filter
                </button>

              </div>
            )}
          </div>

          <div className="filter-group search-group">
            <label style={{ visibility: 'hidden' }}>Search</label>
            <div className="search-pill-wrapper">
              <FiSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Search project..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-pill-input"
              />
            </div>
          </div>
        </section>

        <section className="project-table-container">
          <table className="project-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Phase</th>
                <th>Status</th>
                <th>Plan Start</th>
                <th>Plan End</th>
                <th>Actual Start</th>
                <th>Actual End</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="table-loading">Memuat data project...</td>
                </tr>
              ) : currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => onSelectProject && onSelectProject(item)}
                    style={{ cursor: 'pointer' }}
                    title="Klik untuk melihat Detail Project"
                  >
                    <td className="font-semibold">{item.projectName}</td>
                    <td>{item.phase}</td>
                    <td>{item.status}</td>
                    <td>{item.planStart}</td>
                    <td>{item.planEnd}</td>
                    <td>{item.actualStart}</td>
                    <td>{item.actualEnd}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="table-empty">Data tidak ditemukan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <footer className="project-pagination">
          <button 
            className="page-nav-btn" 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <FiChevronLeft />
          </button>

          {getPaginationRange().map((page, idx) => {
            if (page === '...') {
              return <span key={`dots-${idx}`} className="pagination-dots">...</span>;
            }
            return (
              <button 
                key={page}
                className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            );
          })}

          <button 
            className="page-next-text" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <FiChevronRight />
          </button>
        </footer>
      </main>

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

export default Project;