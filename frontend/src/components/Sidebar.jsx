import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

function Sidebar({ menu, open, onClose }) {
  const location = useLocation();
  const current = `${location.pathname}${location.search}`;
  const currentPath = location.pathname;

  return (
    <>
      <div className={`sidebar-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Menu</span>
          <button className="btn-secondary" type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <nav>
          <ul>
            {menu.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={() => {
                    const targetHasQuery = item.to.includes('?');
                    if (targetHasQuery) return current === item.to ? 'nav-active' : undefined;
                    return currentPath === item.to ? 'nav-active' : undefined;
                  }}
                  onClick={onClose}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
