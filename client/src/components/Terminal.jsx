import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { terminalTheme } from '../terminalTheme.js';

export default function Terminal({ sessionId, server, socket, active, onStatusChange }) {
  const containerRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(null);

  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      scrollback: 5000,
      theme: terminalTheme,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      socket.emit('terminal:input', { sessionId, data });
    });

    term.onSelectionChange(() => {
      const selection = term.getSelection();
      if (selection) navigator.clipboard?.writeText(selection).catch(() => {});
    });

    async function handleContextMenu(e) {
      e.preventDefault();
      try {
        const text = await navigator.clipboard.readText();
        if (text) socket.emit('terminal:input', { sessionId, data: text });
      } catch (_err) {
        // clipboard read denied or empty - ignore
      }
    }
    containerRef.current.addEventListener('contextmenu', handleContextMenu);

    function handleData({ sessionId: sid, data }) {
      if (sid === sessionId) term.write(data);
    }
    function handleStatus({ sessionId: sid, status }) {
      if (sid === sessionId) onStatusChange(status);
    }
    function handleError({ sessionId: sid, message }) {
      if (sid === sessionId) term.write(`\r\n\x1b[31m[error] ${message}\x1b[0m\r\n`);
    }

    socket.on('terminal:data', handleData);
    socket.on('terminal:status', handleStatus);
    socket.on('terminal:error', handleError);

    socket.emit('terminal:connect', {
      sessionId,
      serverId: server.id,
      cols: term.cols,
      rows: term.rows,
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      socket.emit('terminal:resize', { sessionId, cols: term.cols, rows: term.rows });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      containerRef.current?.removeEventListener('contextmenu', handleContextMenu);
      socket.off('terminal:data', handleData);
      socket.off('terminal:status', handleStatus);
      socket.off('terminal:error', handleError);
      socket.emit('terminal:close', { sessionId });
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (active && fitAddonRef.current) {
      fitAddonRef.current.fit();
      xtermRef.current?.focus();
    }
  }, [active]);

  return <div className="terminal-container" style={{ display: active ? 'block' : 'none' }} ref={containerRef} />;
}
