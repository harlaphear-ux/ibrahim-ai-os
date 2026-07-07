import { ICONS } from './icons'

export default function MobileNav({ tabs, active, onSelect }) {
  // All tabs except Analytics (accessible via sidebar on desktop)
  const mobileItems = [
    tabs.find(t => t.id === 'command'),
    tabs.find(t => t.id === 'planner'),
    tabs.find(t => t.id === 'pipeline'),
    tabs.find(t => t.id === 'clients'),
    tabs.find(t => t.id === 'content'),
    tabs.find(t => t.id === 'intel'),
    tabs.find(t => t.id === 'vault'),
  ].filter(Boolean)

  return (
    <div className="mobile-nav">
      <div className="mobile-nav-inner">
        {mobileItems.map(tab => {
          if (!tab) return null
          const Icon = ICONS[tab.id]
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              className={`mobile-nav-item${isActive ? ' active' : ''}`}
              onClick={() => onSelect(tab.id)}
              title={tab.label}
            >
              {Icon && <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />}
              <span>{tab.short}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
