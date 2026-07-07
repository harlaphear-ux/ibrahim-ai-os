import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { ICONS } from './icons'

const APP_VERSION = 'v1.2'

const today = new Date()
const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

export default function Sidebar({ tabs, active, onSelect, collapsed, onToggle, onLogout }) {
  return (
    <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">I</div>
        {!collapsed && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div className="sidebar-title">Ibrahim's AI OS</div>
            <div className="sidebar-subtitle">{APP_VERSION} · AI Operating System</div>
          </div>
        )}
        <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <div className="sidebar-nav">
        {!collapsed && <div className="nav-section-label">Navigation</div>}
        {tabs.map(tab => {
          const Icon = ICONS[tab.id]
          return (
            <button
              key={tab.id}
              className={`nav-item${active === tab.id ? ' active' : ''}`}
              onClick={() => onSelect(tab.id)}
              title={collapsed ? tab.label : undefined}
            >
              <span className="nav-item-icon">
                {Icon && <Icon size={16} />}
              </span>
              {!collapsed && <span className="nav-item-label">{tab.label}</span>}
            </button>
          )
        })}
      </div>

      <div className="sidebar-footer">
        {!collapsed && <div className="sidebar-date">{dateStr}</div>}
        <button
          className="nav-item"
          onClick={onLogout}
          title={collapsed ? 'Sign Out' : undefined}
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          <span className="nav-item-icon"><LogOut size={15} /></span>
          {!collapsed && <span className="nav-item-label">Sign Out</span>}
        </button>
      </div>
    </nav>
  )
}
