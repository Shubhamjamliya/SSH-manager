import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api/axios';
import Sidebar from '../components/Sidebar.jsx';
import TerminalTabs from '../components/TerminalTabs.jsx';
import AddServerModal from '../components/AddServerModal.jsx';
import ProfileModal from '../components/ProfileModal.jsx';
import ManageAccessModal from '../components/ManageAccessModal.jsx';
import SnippetsPanel from '../components/SnippetsPanel.jsx';
import CommandHistoryPanel from '../components/CommandHistoryPanel.jsx';
import LogsPanel from '../components/LogsPanel.jsx';
import DeploySopPanel from '../components/DeploySopPanel.jsx';

let sessionCounter = 0;

export default function Dashboard() {
  const [servers, setServers] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [accessModalServer, setAccessModalServer] = useState(null);
  const [rightPanel, setRightPanel] = useState('snippets');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    api.get('/api/servers').then((res) => setServers(res.data.servers));

    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') },
    });
    socketRef.current = socket;

    return () => socket.disconnect();
  }, []);

  function handleConnect(server) {
    const sessionId = `sess-${++sessionCounter}`;
    setTabs((prev) => [...prev, { sessionId, server }]);
    setActiveId(sessionId);
    setMobileSidebarOpen(false);
  }

  function handleCloseTab(sessionId) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.sessionId !== sessionId);
      if (activeId === sessionId) setActiveId(next[next.length - 1]?.sessionId || null);
      return next;
    });
    setStatuses((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  }

  function handleStatusChange(sessionId, status) {
    setStatuses((prev) => ({ ...prev, [sessionId]: status }));
  }

  function runInActiveTerminal(command) {
    if (!activeId || !socketRef.current) return;
    socketRef.current.emit('terminal:input', { sessionId: activeId, data: `${command}\r` });
  }

  const activeTab = tabs.find((t) => t.sessionId === activeId);

  // Server status dots in the sidebar reflect the most recent session opened for that server.
  const serverStatuses = {};
  for (const tab of tabs) {
    serverStatuses[tab.server.id] = statuses[tab.sessionId] || 'connecting';
  }

  return (
    <div className="dashboard">
      <div className="mobile-topbar">
        <button
          type="button"
          className="mobile-topbar-btn"
          onClick={() => setMobileSidebarOpen((v) => !v)}
          aria-label="Toggle servers"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <span className="mobile-topbar-title">ServerPilot</span>
        <button
          type="button"
          className="mobile-topbar-btn"
          onClick={() => setMobileToolsOpen((v) => !v)}
          aria-label="Toggle tools"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {(mobileSidebarOpen || mobileToolsOpen) && (
        <div
          className="mobile-backdrop"
          onClick={() => {
            setMobileSidebarOpen(false);
            setMobileToolsOpen(false);
          }}
        />
      )}

      <Sidebar
        servers={servers}
        statuses={serverStatuses}
        onConnect={handleConnect}
        onAddServer={() => setShowAddModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onManageAccess={setAccessModalServer}
        mobileOpen={mobileSidebarOpen}
      />
      {socketRef.current && (
        <TerminalTabs
          tabs={tabs}
          socket={socketRef.current}
          onCloseTab={handleCloseTab}
          statuses={statuses}
          onStatusChange={handleStatusChange}
          activeId={activeId}
          onActivate={setActiveId}
        />
      )}

      <div
        className={`right-panel ${rightPanel === 'deploy' ? 'right-panel-wide' : ''} ${
          mobileToolsOpen ? 'right-panel-mobile-open' : ''
        }`}
      >
        <div className="right-panel-tabs">
          <button
            className={rightPanel === 'snippets' ? 'active' : ''}
            onClick={() => setRightPanel('snippets')}
          >
            Snippets
          </button>
          <button
            className={rightPanel === 'history' ? 'active' : ''}
            onClick={() => setRightPanel('history')}
          >
            History
          </button>
          <button
            className={rightPanel === 'logs' ? 'active' : ''}
            onClick={() => setRightPanel('logs')}
          >
            Logs
          </button>
          <button
            className={rightPanel === 'deploy' ? 'active' : ''}
            onClick={() => setRightPanel('deploy')}
          >
            Deploy SOP
          </button>
        </div>
        {rightPanel === 'snippets' && <SnippetsPanel onRun={runInActiveTerminal} />}
        {rightPanel === 'history' && (
          <CommandHistoryPanel serverId={activeTab?.server.id} onRun={runInActiveTerminal} />
        )}
        {rightPanel === 'logs' && <LogsPanel />}
        {rightPanel === 'deploy' && socketRef.current && (
          <DeploySopPanel socket={socketRef.current} servers={servers} />
        )}
      </div>

      {showAddModal && (
        <AddServerModal
          onClose={() => setShowAddModal(false)}
          onCreated={(server) => {
            setServers((prev) => [...prev, server]);
            setShowAddModal(false);
          }}
        />
      )}

      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}

      {accessModalServer && (
        <ManageAccessModal server={accessModalServer} onClose={() => setAccessModalServer(null)} />
      )}
    </div>
  );
}
