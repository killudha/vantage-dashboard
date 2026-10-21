import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import '../styles/Project.css';
import { fetchExcelData } from '../utils/fetchExcel';
import { 
  FiGrid,
  FiFolder,
  FiBell, 
  FiSearch, 
  FiChevronsLeft,
  FiChevronsRight,
  FiChevronLeft,
  FiChevronRight,
  FiLogOut
} from 'react-icons/fi';

const SHAREPOINT_LINK = 'https://xlo365-my.sharepoint.com/:x:/g/personal/intr_dhannya_xlsmart_co_id/IQD1GsY01XbVT6XJqFGIcy_vAZn_AcqW4X0m_Og3AgdjiuA?e=HogYEf';

const Project = ({ onLogout, activeTab = 'projects', onNavigate, onSelectProject }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // State Filter & Search
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [filterCategory, setFilterCategory] = useState('Date');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPic, setFilterPic] = useState('PIC');
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadExcel = async () => {
      setLoading(true);
      try {
        const rawData = await fetchExcelData(SHAREPOINT_LINK);
        
        const formattedData = rawData.map((row, index) => ({
          id: index + 1,
          projectName: row['Project Name'] || row['Title'] || row['Nama Project'] || 'Disney+',
          phase: row['Phase'] || row['phase'] || 'Development',
          status: row['Status'] || row['status'] || 'Done',
          planStart: row['Plan Start'] || row['plannedStart'] || '15/09/2026',
          planEnd: row['Plan End'] || row['plannedEnd'] || '18/09/2026',
          actualStart: row['Actual Start'] || row['actualStart'] || '01/10/2024',
          actualEnd: row['Actual End'] || row['actualEnd'] || '9/30/2026',
          pm: row['PM'] || row['PIC'] || 'AL GANTENG'
        }));

        setProjects(formattedData);
        setFilteredProjects(formattedData);
      } catch (err) {
        console.error('Gagal memuat data Excel:', err);
        const fallbackData = Array.from({ length: 84 }, (_, i) => ({
          id: i + 1,
          projectName: 'Disney+',
          phase: 'Development',
          status: 'Done',
          planStart: '15/09/2026',
          planEnd: '18/09/2026',
          actualStart: '01/10/2024',
          actualEnd: '9/30/2026',
          pm: i % 2 === 0 ? 'Fina' : 'AL GANTENG'
        }));
        setProjects(fallbackData);
        setFilteredProjects(fallbackData);
      } finally {
        setLoading(false);
      }
    };

    loadExcel();
  }, []);

  useEffect(() => {
    let result = [...projects];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.projectName.toLowerCase().includes(q) ||
        item.phase.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    }

    if (filterCategory === 'Backend') {
      result = result.filter(item => item.phase.toLowerCase().includes('backend'));
    } else if (filterCategory === 'Delayed') {
      result = result.filter(item => item.status.toLowerCase().includes('delay'));
    } else if (filterCategory === 'Fina') {
      result = result.filter(item => item.pm.toLowerCase() === 'fina');
    } else if (filterCategory === 'Disney +') {
      result = result.filter(item => item.projectName.toLowerCase().includes('disney'));
    }

    if (filterPic !== 'PIC') {
      result = result.filter(item => item.pm.toLowerCase() === filterPic.toLowerCase());
    }

    if (dateStart) {
      result = result.filter(item => {
        const parts = item.planStart.split('/');
        if (parts.length === 3) {
          const itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
          return itemDate >= new Date(dateStart);
        }
        return true;
      });
    }

    if (dateEnd) {
      result = result.filter(item => {
        const parts = item.planEnd.split('/');
        if (parts.length === 3) {
          const itemDate = new Date(parts[2], parts[1] - 1, parts[0]);
          return itemDate <= new Date(dateEnd);
        }
        return true;
      });
    }

    setFilteredProjects(result);
    setCurrentPage(1);
  }, [searchQuery, dateStart, dateEnd, filterCategory, filterPic, projects]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProjects.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSelectFilter = (val) => {
    setFilterCategory(val);
    setIsFilterOpen(false);
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
      <main className="project-page-container">
        <header className="project-top-header">
          <button className="sidebar-toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} aria-label="Toggle Sidebar">
            {sidebarCollapsed ? <FiChevronsRight /> : <FiChevronsLeft />}
          </button>

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

        {/* Filter Controls Bar */}
        <section className="project-filter-bar">
          <div className="filter-group">
            <label>Date Start</label>
            <div className="pill-input-wrapper">
              <input 
                type="date" 
                value={dateStart} 
                onChange={(e) => setDateStart(e.target.value)}
                className="filter-pill-date"
                placeholder="dd/mm/yyyy"
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
                placeholder="dd/mm/yyyy"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Filter</label>
            <div className="custom-dropdown-wrapper">
              <button 
                type="button" 
                className="filter-pill-button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                {filterCategory}
              </button>

              {isFilterOpen && (
                <div className="custom-filter-dropdown">
                  <div 
                    className={`filter-item ${filterCategory === 'This Month' ? 'active' : ''}`}
                    onClick={() => handleSelectFilter('This Month')}
                  >
                    <span>This Month</span>
                    <span className="arrow-indicator">∧</span>
                  </div>

                  <div 
                    className={`filter-item ${filterCategory === 'Last Month' ? 'active' : ''}`}
                    onClick={() => handleSelectFilter('Last Month')}
                  >
                    <span>Last Month</span>
                  </div>

                  <div 
                    className={`filter-item ${filterCategory === 'Date' ? 'active' : ''}`}
                    onClick={() => handleSelectFilter('Date')}
                  >
                    <span>Date</span>
                    <span className="arrow-indicator">∨</span>
                  </div>

                  <div 
                    className="filter-item-badge-row"
                    onClick={() => handleSelectFilter('Backend')}
                  >
                    <span className="badge-label">Phase</span>
                    <span className="filter-badge">Backend</span>
                  </div>

                  <div 
                    className="filter-item-badge-row"
                    onClick={() => handleSelectFilter('Delayed')}
                  >
                    <span className="badge-label">Status</span>
                    <span className="filter-badge">Delayed</span>
                  </div>

                  <div 
                    className="filter-item-badge-row"
                    onClick={() => handleSelectFilter('Fina')}
                  >
                    <span className="badge-label">PM</span>
                    <span className="filter-badge">Fina</span>
                  </div>

                  <div 
                    className="filter-item-badge-row"
                    onClick={() => handleSelectFilter('Disney +')}
                  >
                    <span className="badge-label">Name</span>
                    <span className="filter-badge">Disney +</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="filter-group">
            <label>Filter</label>
            <select 
              value={filterPic}
              onChange={(e) => setFilterPic(e.target.value)}
              className="filter-pill-select"
            >
              <option value="PIC">PIC</option>
              <option value="Fina">Fina</option>
              <option value="AL">AL</option>
            </select>
          </div>

          <div className="filter-group search-group">
            <label style={{ visibility: 'hidden' }}>Search</label>
            <div className="search-pill-wrapper">
              <FiSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Search" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-pill-input"
              />
            </div>
          </div>
        </section>

        {/* Data Table */}
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

        {/* Pagination */}
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