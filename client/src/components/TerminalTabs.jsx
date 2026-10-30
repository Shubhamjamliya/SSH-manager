import Terminal from './Terminal.jsx';

export default function TerminalTabs({ tabs, socket, onCloseTab, statuses, onStatusChange, activeId, onActivate }) {
  if (tabs.length === 0) {
    return (
      <div className="terminal-empty">
        <p>Select a server from the sidebar to open a terminal session.</p>
      </div>
    );
  }

  const active = tabs.some((t) => t.sessionId === activeId) ? activeId : tabs[tabs.length - 1].sessionId;

  return (
    <div className="terminal-area">
      <div className="terminal-tabs">
        {tabs.map((tab) => (
          <div key={tab.sessionId} className={`tab ${tab.sessionId === active ? 'tab-active' : ''}`}>
            <span
              className={`status-dot ${statuses[tab.sessionId] || 'offline'}`}
              onClick={() => onActivate(tab.sessionId)}
            />
            <span onClick={() => onActivate(tab.sessionId)}>{tab.server.name}</span>
            <button className="tab-close" onClick={() => onCloseTab(tab.sessionId)}>
              x
            </button>
          </div>
        ))}
      </div>
      <div className="terminal-panels">
        {tabs.map((tab) => (
          <Terminal
            key={tab.sessionId}
            sessionId={tab.sessionId}
            server={tab.server}
            socket={socket}
            active={tab.sessionId === active}
            onStatusChange={(status) => onStatusChange(tab.sessionId, status)}
          />
        ))}
      </div>
    </div>
  );
}
