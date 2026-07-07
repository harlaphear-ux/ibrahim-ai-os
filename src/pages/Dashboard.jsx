import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import MobileNav from '../components/MobileNav'
import FloatingConsultant from '../components/FloatingConsultant'
import CommandCenter from '../tabs/CommandCenter'
import Planner from '../tabs/Planner'
import Pipeline from '../tabs/Pipeline'
import Clients from '../tabs/Clients'
import Content from '../tabs/Content'
import Analytics from '../tabs/Analytics'
import IntelHub from '../tabs/IntelHub'
import Vault from '../tabs/Vault'

export const TABS = [
  { id: 'command',   label: 'Command Center',  short: 'Command',  emoji: '⚡' },
  { id: 'planner',   label: 'Planner',          short: 'Planner',  emoji: '📅' },
  { id: 'pipeline',  label: 'CRM Pipeline',     short: 'Pipeline', emoji: '🔥' },
  { id: 'clients',   label: 'Clients',          short: 'Clients',  emoji: '🤝' },
  { id: 'content',   label: 'Content Engine',   short: 'Content',  emoji: '✍️' },
  { id: 'analytics', label: 'Analytics',        short: 'Stats',    emoji: '📊' },
  { id: 'intel',     label: 'Intelligence Hub', short: 'Intel',    emoji: '🧠' },
  { id: 'vault',     label: 'Vault',            short: 'Vault',    emoji: '🗄️' },
]

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('command')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const tabMap = {
    command:   <CommandCenter />,
    planner:   <Planner />,
    pipeline:  <Pipeline />,
    clients:   <Clients onNavigate={setActiveTab} />,
    content:   <Content />,
    analytics: <Analytics />,
    intel:     <IntelHub />,
    vault:     <Vault onLogout={onLogout} />,
  }

  return (
    <>
      <div className="app-shell">
        <Sidebar
          tabs={TABS}
          active={activeTab}
          onSelect={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          onLogout={onLogout}
        />

        <main className={`main-content${sidebarCollapsed ? ' collapsed' : ''}`}>
          <div className="tab-content">
            {tabMap[activeTab]}
          </div>
        </main>

        <MobileNav tabs={TABS} active={activeTab} onSelect={setActiveTab} />
      </div>

      {/* Outside app-shell so position:fixed works correctly on iOS Safari */}
      <FloatingConsultant activeTab={activeTab} />
    </>
  )
}
