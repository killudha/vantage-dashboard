import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Dashboard.css';
import '../styles/Project.css';
import { 
  FiGrid,
  FiFolder,
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

const Project = ({ onLogout, activeTab = 'projects', onNavigate, onSelectProject }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [pmList, setPmList] = useState([]);
  const [phaseList, setPhaseList] = useState([]);
  const [statusList, setStatusList] = useState([]);

  const [selectedPm, setSelectedPm] = useState('All PM');
  const [selectedPhase, setSelectedPhase] = useState('All Phases');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchProjectData = async () => {
      setLoading(true);
      const token = localStorage.getItem('vantage_token');
      
      if (!token) {
        if(onLogout) onLogout();
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
              const statusVal = row.computedStatus || row['Status'] || 'On Going';
              
              return {
                id: index + 1,
                projectName: String(row['Project Name'] || row['Title'] || row['Nama Project'] || 'Disney+'),
                phase: String(phaseVal),
                status: String(statusVal),
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
            const uniqueStatuses = Array.from(new Set(formattedData.map(item => item.status))).filter(Boolean);

            setPmList(uniquePms);
            setPhaseList(uniquePhases);
            setStatusList(uniqueStatuses);

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
      result = result.filter(item => String(item.status).toLowerCase() === String(selectedStatus).toLowerCase());
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
  };

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

      <main className="project-page-container">
        <header className="project-top-header">
          <div style={{ width: '0px' }}></div>

          <div className="project-title-pill">
            <h1>PROJECTS</h1>
          </div>

          <div className="project-header-right">
            <div className="notification-bell">
              <FiBell className="bell-icon" />
              <span className="bell-badge">8</span>
            </div>
            <div className="user-avatar">
              <img src="https://via.placeholder.com/40" alt="User Profile" />
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

          <button 
            className={`page-num-btn ${currentPage === 1 ? 'active' : ''}`}
            onClick={() => handlePageChange(1)}
          >
            1
          </button>

          {totalPages >= 2 && (
            <button 
              className={`page-num-btn ${currentPage === 2 ? 'active' : ''}`}
              onClick={() => handlePageChange(2)}
            >
              2
            </button>
          )}

          {totalPages >= 3 && (
            <button 
              className={`page-num-btn ${currentPage === 3 ? 'active' : ''}`}
              onClick={() => handlePageChange(3)}
            >
              3
            </button>
          )}

          {totalPages > 4 && <span className="pagination-dots">...</span>}

          {totalPages > 3 && (
            <button 
              className={`page-num-btn ${currentPage === totalPages - 1 ? 'active' : ''}`}
              onClick={() => handlePageChange(totalPages - 1)}
            >
              {totalPages - 1}
            </button>
          )}

          {totalPages > 3 && (
            <button 
              className={`page-num-btn ${currentPage === totalPages ? 'active' : ''}`}
              onClick={() => handlePageChange(totalPages)}
            >
              {totalPages}
            </button>
          )}

          <button 
            className="page-next-text" 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next <FiChevronRight />
          </button>
        </footer>
      </main>
    </div>
  );
};

export default Project;