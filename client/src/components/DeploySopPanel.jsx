import { useMemo, useState } from 'react';
import { buildDeploySop } from '../deploySopTemplate.js';
import DeployRunner from './DeployRunner.jsx';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_err) {
      // clipboard denied - ignore
    }
  }

  return (
    <button type="button" className="sop-copy-btn" onClick={handleCopy}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function DeploySopPanel({ socket, servers }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [ip, setIp] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [showRunner, setShowRunner] = useState(false);

  const sections = useMemo(
    () => buildDeploySop({ name, domain, ip, repoUrl }),
    [name, domain, ip, repoUrl]
  );

  return (
    <div className="side-panel sop-panel">
      <div className="connections-header">
        <h3>Deployment SOP</h3>
        <p className="field-hint">
          Fill in your project's details — every command below updates automatically. Click Copy to grab any
          command or config block.
        </p>
      </div>

      <div className="sop-form">
        <div>
          <label>Project name</label>
          <input placeholder="myapp" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label>Domain</label>
          <input placeholder="example.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </div>
        <div>
          <label>VPS IP</label>
          <input placeholder="203.0.113.10" value={ip} onChange={(e) => setIp(e.target.value)} />
        </div>
        <div>
          <label>Git repo URL (optional)</label>
          <input
            placeholder="git@github.com:you/repo.git"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        className="deploy-run-btn deploy-run-btn-full"
        disabled={!servers?.length}
        onClick={() => setShowRunner(true)}
        title={!servers?.length ? 'Add a server first' : undefined}
      >
        Run this deployment on a server
      </button>

      {showRunner && (
        <DeployRunner
          socket={socket}
          servers={servers}
          params={{ name, domain, ip, repoUrl }}
          onClose={() => setShowRunner(false)}
        />
      )}

      <div className="sop-sections">
        {sections.map((section) => (
          <div key={section.title} className="sop-section">
            <h4>{section.title}</h4>
            {section.items.map((item, i) => {
              if (item.type === 'info') {
                return (
                  <p key={i} className="muted sop-info">
                    {item.text}
                  </p>
                );
              }
              return (
                <div key={i} className={`sop-item ${item.type === 'block' ? 'sop-item-block' : ''}`}>
                  <pre>{item.text}</pre>
                  <CopyButton text={item.text} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
