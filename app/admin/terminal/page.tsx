'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Terminal, Send, Copy, CheckCircle, AlertTriangle, Info, X, Maximize2, Minimize2 } from 'lucide-react';

type TerminalMessage = {
  id: string;
  type: 'command' | 'output' | 'error' | 'success' | 'info';
  content: string;
  timestamp: Date;
};

export default function AdminTerminalPage() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<TerminalMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const messageSeqRef = useRef(0);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Auto-scroll to bottom
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [messages]);

  const isDark = mounted && theme === 'dark';

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    terminalBg: isDark ? '#0D1117' : '#1e1e1e',
    terminalText: '#00FF00',
  };

  const addMessage = (type: TerminalMessage['type'], content: string) => {
    messageSeqRef.current += 1;
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${messageSeqRef.current}`,
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const executeCommand = async (cmd: string) => {
    const command = cmd.trim().toLowerCase();
    
    addMessage('command', cmd);

    // Simulate command execution
    setTimeout(() => {
      if (command === 'help') {
        addMessage('info', 'Available commands:');
        addMessage('info', '  help     - Show this help message');
        addMessage('info', '  status   - Show system status');
        addMessage('info', '  db       - Show database information');
        addMessage('info', '  users    - List all users');
        addMessage('info', '  products - List all products');
        addMessage('info', '  clear    - Clear terminal');
        addMessage('info', '  version  - Show system version');
      } else if (command === 'status') {
        addMessage('success', 'System Status:');
        addMessage('info', '  API Server: Online');
        addMessage('info', '  Database: Online (Supabase)');
        addMessage('info', '  AI Service: Online (Gemini)');
        addMessage('success', 'All systems operational');
      } else if (command === 'db') {
        addMessage('info', 'Database Information:');
        addMessage('info', '  Provider: PostgreSQL (Supabase)');
        addMessage('info', '  Pool Mode: Transaction');
        addMessage('info', '  Region: eu-central-2');
        addMessage('info', '  Tables: 8');
      } else if (command === 'users') {
        addMessage('info', 'Fetching users...');
        addMessage('info', '  Total Users: 13');
        addMessage('info', '  Active: 11');
        addMessage('info', '  Admin: 2');
      } else if (command === 'products') {
        addMessage('info', 'Fetching products...');
        addMessage('info', '  Total Products: 26');
        addMessage('info', '  In Stock: 18');
        addMessage('info', '  Low Stock: 5');
        addMessage('info', '  Out of Stock: 3');
      } else if (command === 'clear') {
        setMessages([]);
      } else if (command === 'version') {
        addMessage('info', 'Azzay Pharmacy Management System');
        addMessage('info', '  Version: 1.0.0');
        addMessage('info', '  Build: 2026.05.09');
        addMessage('info', '  Environment: Development');
      } else if (command === '') {
        // Empty command, do nothing
      } else {
        addMessage('error', `Unknown command: ${cmd}`);
        addMessage('info', 'Type "help" for available commands');
      }
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      executeCommand(input);
      setInput('');
    }
  };

  const copyToClipboard = () => {
    const terminalText = messages.map(m => `[${m.type.toUpperCase()}] ${m.content}`).join('\n');
    navigator.clipboard.writeText(terminalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!mounted) return null;

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 ${isExpanded ? 'fixed inset-0 z-50 bg-slate-900 dark:bg-slate-950 p-6' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold mb-1 flex items-center gap-3" style={{ color: card.text }}>
            <Terminal size={28} style={{ color: card.primary }} />
            Admin Terminal
          </h1>
          <p className="text-sm" style={{ color: card.muted }}>Execute system commands and manage the application.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="p-2 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ color: card.text }}
          >
            {copied ? <CheckCircle size={20} color="#10B981" /> : <Copy size={20} />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ color: card.text }}
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>

      <div
        className="rounded-2xl border overflow-hidden flex flex-col"
        style={{
          background: card.terminalBg,
          borderColor: card.border,
          boxShadow: card.shadow,
          height: isExpanded ? 'calc(100vh - 200px)' : '600px'
        }}
      >
        {/* Terminal Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs font-mono ml-4" style={{ color: card.muted }}>azzay-pharma-admin-terminal</span>
        </div>

        {/* Terminal Output */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2 custom-scrollbar"
          style={{ color: card.terminalText }}
        >
          {messages.length === 0 && (
            <div className="space-y-1">
              <div style={{ color: '#00FF00' }}>Azzay Pharmacy Management System v1.0.0</div>
              <div style={{ color: card.muted }}>Type 'help' for available commands</div>
              <div style={{ color: card.muted }}>----------------------------------------</div>
            </div>
          )}
          {messages.map((msg) => {
            let icon = null;
            let color = card.terminalText;
            
            if (msg.type === 'error') {
              icon = <AlertTriangle size={12} className="inline mr-2" />;
              color = '#EF4444';
            } else if (msg.type === 'success') {
              icon = <CheckCircle size={12} className="inline mr-2" />;
              color = '#10B981';
            } else if (msg.type === 'info') {
              icon = <Info size={12} className="inline mr-2" />;
              color = '#0EA5E9';
            } else if (msg.type === 'command') {
              color = '#F59E0B';
            }

            return (
              <div key={msg.id} className="flex items-start gap-2">
                <span className="text-[10px] opacity-50 mt-0.5">
                  {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {icon}
                <span style={{ color }}>{msg.content}</span>
              </div>
            );
          })}
        </div>

        {/* Terminal Input */}
        <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <span style={{ color: card.terminalText }}>$</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a command..."
              className="flex-1 bg-transparent outline-none font-mono text-sm"
              style={{ color: card.terminalText }}
              autoFocus
            />
            <button
              type="submit"
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: card.terminalText }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['help', 'status', 'db', 'clear'].map((cmd) => (
          <button
            key={cmd}
            onClick={() => executeCommand(cmd)}
            className="px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background: card.primaryBg, color: card.primary, border: `1px solid ${card.primaryBg}` }}
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
