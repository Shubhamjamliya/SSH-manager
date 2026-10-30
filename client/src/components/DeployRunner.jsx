import { useEffect, useRef, useState } from 'react';

const STATUS_ICON = { pending: '○', running: '◐', success: '✓', failed: '✗' };

export default function DeployRunner({ socket, servers, params, onClose }) {
  const [serverId, setServerId] = useState(servers[0]?.id || '');
  const [email, setEmail] = useState('');
  const [backendEnv, setBackendEnv] = useState('');
  const [frontendEnv, setFrontendEnv] = useState('VITE_API_BASE_URL=/api');
  const [confirmText, setConfirmText] = useState('');
  const [phase, setPhase] = useState('form'); // form | running | done | failed | stopped | error
  const [planLabels, setPlanLabels] = useState([]);
  const [stepStates, setStepStates] = useState([]); // { status, output }
  const [errorMessage, setErrorMessage] = useState('');
  const runIdRef = useRef(null);
  const logEndRef = useRef(null);

  const selectedServer = servers.find((s) => s.id === serverId);
  const confirmPhrase = selectedServer ? `DEPLOY ${selectedServer.name}` : '';
  const canRun = selectedServer && confirmText === confirmPhrase;

  useEffect(() => {
    function handlePlan({ runId, steps }) {
      if (runId !== runIdRef.current) return;
      setPlanLabels(steps);
      setStepStates(steps.map(() => ({ status: 'pending', output: '' })));
    }
    function handleStepStart({ runId, index }) {
      if (runId !== runIdRef.current) return;
      setStepStates((prev) => prev.map((s, i) => (i === index ? { ...s, status: 'running' } : s)));
    }
    function handleStepDone({ runId, index, ok, output }) {
      if (runId !== runIdRef.current) return;
      setStepStates((prev) =>
        prev.map((s, i) => (i === index ? { status: ok ? 'success' : 'failed', output: output || '' } : s))
      );
    }
    function handleFailed({ runId, message }) {
      if (runId !== runIdRef.current) return;
      setPhase('failed');
      setErrorMessage(message);
    }
    function handleComplete({ runId }) {
      if (runId !== runIdRef.current) return;
      setPhase('done');
    }
    function handleStopped({ runId }) {
      if (runId !== runIdRef.current) return;
      setPhase('stopped');
    }
    function handleError({ runId, message }) {
      if (runId !== runIdRef.current) return;
      setPhase('error');
      setErrorMessage(message);
    }

    socket.on('deploy:plan', handlePlan);
    socket.on('deploy:step-start', handleStepStart);
    socket.on('deploy:step-done', handleStepDone);
    socket.on('deploy:failed', handleFailed);
    socket.on('deploy:complete', handleComplete);
    socket.on('deploy:stopped', handleStopped);
    socket.on('deploy:error', handleError);

    return () => {
      socket.off('deploy:plan', handlePlan);
      socket.off('deploy:step-start', handleStepStart);
      socket.off('deploy:step-done', handleStepDone);
      socket.off('deploy:failed', handleFailed);
      socket.off('deploy:complete', handleComplete);
      socket.off('deploy:stopped', handleStopped);
      socket.off('deploy:error', handleError);
    };
  }, [socket]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stepStates]);

  function handleRun() {
    const runId = `deploy-${Date.now()}`;
    runIdRef.current = runId;
    setPhase('running');
    setPlanLabels([]);
    setStepStates([]);
    setErrorMessage('');
    socket.emit('deploy:start', {
      runId,
      serverId,
      params: {
        ...params,
        email: email.trim() || undefined,
        backendEnv: backendEnv.trim() || undefined,
        frontendEnv: frontendEnv.trim() || undefined,
      },
    });
  }

  function handleStop() {
    if (runIdRef.current) socket.emit('deploy:stop', { runId: runIdRef.current });
  }

  return (
    <div className="modal-overlay" onClick={phase === 'running' ? undefined : onClose}>
      <div className="modal-card deploy-runner-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Run deployment</h2>

        {phase === 'form' && (
          <>
            <p className="field-hint">
              This connects to the selected server over SSH and runs the deployment steps for real — installing
              packages, writing the Nginx config, building and copying the frontend, starting PM2 processes, and
              (if an email is given) requesting an SSL certificate. It can overwrite files on that server.
            </p>

            <label>Target server</label>
            <select value={serverId} onChange={(e) => setServerId(e.target.value)}>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.host})
                </option>
              ))}
            </select>

            <label>Email for SSL certificate (optional)</label>
            <input
              type="email"
              placeholder="Leave blank to skip SSL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <label>Backend .env contents (optional)</label>
            <textarea
              className="key-textarea"
              placeholder="PORT=5000&#10;MONGODB_URI=...&#10;JWT_ACCESS_SECRET=..."
              value={backendEnv}
              onChange={(e) => setBackendEnv(e.target.value)}
              rows={6}
            />

            <label>Frontend .env contents</label>
            <textarea
              className="key-textarea"
              placeholder="VITE_API_BASE_URL=/api"
              value={frontendEnv}
              onChange={(e) => setFrontendEnv(e.target.value)}
              rows={3}
            />

            <label>
              Type <code>{confirmPhrase}</code> to confirm
            </label>
            <input
              placeholder={confirmPhrase}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />

            <div className="modal-actions">
              <button type="button" className="secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="deploy-run-btn" disabled={!canRun} onClick={handleRun}>
                Run deployment
              </button>
            </div>
          </>
        )}

        {phase !== 'form' && (
          <>
            <div className="deploy-run-header">
              <strong>{selectedServer?.name}</strong>
              {phase === 'running' && <span className="deploy-phase deploy-phase-running">Running…</span>}
              {phase === 'done' && <span className="deploy-phase deploy-phase-success">Complete</span>}
              {phase === 'failed' && <span className="deploy-phase deploy-phase-failed">Failed</span>}
              {phase === 'stopped' && <span className="deploy-phase deploy-phase-failed">Stopped</span>}
              {phase === 'error' && <span className="deploy-phase deploy-phase-failed">Error</span>}
            </div>

            {errorMessage && <div className="error-banner">{errorMessage}</div>}

            <div className="deploy-steps">
              {planLabels.map((label, i) => {
                const state = stepStates[i] || { status: 'pending', output: '' };
                return (
                  <div key={i} className={`deploy-step deploy-step-${state.status}`}>
                    <div className="deploy-step-header">
                      <span className="deploy-step-icon">{STATUS_ICON[state.status]}</span>
                      <span>{label}</span>
                    </div>
                    {state.output && <pre className="deploy-step-output">{state.output}</pre>}
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>

            <div className="modal-actions">
              {phase === 'running' ? (
                <button type="button" className="secondary" onClick={handleStop}>
                  Stop
                </button>
              ) : (
                <button type="button" className="secondary" onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
