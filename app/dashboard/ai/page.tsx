'use client';

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Send, Sparkles, AlertTriangle, TrendingUp, Package, Pill, FileText, DollarSign, BarChart3 } from 'lucide-react';
import { gql, M_ASK_NEXUS_AI } from '@/lib/gql';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

type QuickAction = {
  label: string;
  prompt: string;
  icon: React.FC<{ size?: number; className?: string }>;
  color: string;
  bg: string;
};

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  content: "Hello. I'm the Azzay NEXUS AI — powered by Gemini. I can help you with drug interaction checks, sales forecasting, inventory intelligence, and prescription analysis. How can I assist you today?",
  timestamp: new Date(),
};

function formatAiResponse(text: string): string {
  // Preserve line breaks
  let formatted = text.replace(/\n/g, '<br />');
  
  // Format headers (## Header)
  formatted = formatted.replace(/## (.*)/g, '<strong class="text-base mt-3 mb-1 block">$1</strong>');
  
  // Format bold text (**text**)
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Format bullet points (• or -)
  formatted = formatted.replace(/^• (.*)/gm, '<span class="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 align-middle"></span>$1');
  formatted = formatted.replace(/^- (.*)/gm, '<span class="inline-block w-1.5 h-1.5 rounded-full bg-current mr-2 align-middle"></span>$1');
  
  // Format numbered lists (1. )
  formatted = formatted.replace(/^\d+\. (.*)/gm, '<span class="font-bold mr-1">$1</span>');
  
  // Format code blocks (```)
  formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/10 p-2 rounded text-xs my-2 overflow-x-auto"><code>$1</code></pre>');
  
  // Format inline code (`code`)
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-black/10 px-1 rounded text-xs">$1</code>');
  
  return formatted;
}

function getSimulatedResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('interaction') || lower.includes('warfarin') || lower.includes('aspirin')) {
    return `⚠️ Drug Interaction Analysis\n\nSeverity: HIGH\n\nWarfarin + Aspirin: Concurrent use significantly increases bleeding risk. Both agents inhibit platelet function and coagulation pathways.\n\nWarfarin + Omeprazole: MODERATE interaction. Omeprazole inhibits CYP2C19, potentially increasing Warfarin plasma levels.\n\nRecommendations:\n• Monitor INR closely (every 3–5 days initially)\n• Consider alternative analgesic (e.g., Paracetamol)\n• Counsel patient on bleeding signs\n• Document in patient record`;
  }
  if (lower.includes('forecast') || lower.includes('demand') || lower.includes('antimalarial')) {
    return `📈 Demand Forecast — Antimalarials\n\nBased on historical patterns for Dormaa Central:\n\n• Peak season: April–June (rainy season onset)\n• Expected demand increase: +35–45% over next 30 days\n• Top products at risk: Artemether-Lumefantrine, Artesunate\n\nRecommended reorder quantities:\n• Lonart Forte (AL): +120 packs\n• Artesunate 200mg: +60 packs\n\nEstimated revenue impact: GH₵ 4,200–5,800`;
  }
  if (lower.includes('stockout') || lower.includes('reorder') || lower.includes('stock')) {
    return `📦 Stockout Risk Analysis\n\nProducts at HIGH risk (< 7 days supply):\n• Amoxicillin 250mg — 12 units left (est. 4 days)\n• Metronidazole 400mg — 8 units left (est. 3 days)\n\nProducts at MODERATE risk (7–14 days):\n• Ciprofloxacin 500mg — 28 units\n• ORS Sachets — 15 units\n\nSuggested action: Place purchase order with primary supplier within 48 hours.`;
  }
  if (lower.includes('prescription') || lower.includes('prescribed')) {
    return `💊 Prescription Trend Summary\n\nTop drug combinations this month:\n1. Amoxicillin + Paracetamol (38 prescriptions)\n2. Artemether-Lumefantrine + Paracetamol (29 prescriptions)\n3. Metformin + Lisinopril (14 prescriptions)\n\nNotable patterns:\n• 22% increase in antibiotic prescriptions vs. last month\n• Diabetes management drugs up 8%\n• Average prescription value: GH₵ 45.20`;
  }
  return `I've received your query: "${prompt}"\n\nI'm currently operating in demo mode. Connect the Gemini API key in your environment configuration to enable full AI capabilities including real-time drug interaction checks, predictive analytics, and prescription intelligence.`;
}

export default function AiAssistantPage() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === 'dark' || theme === 'dark');

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const card = {
    bg: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)',
    border: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    shadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
    text: isDark ? '#F8FAFC' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    subtle: isDark ? '#64748B' : '#94A3B8',
    primary: isDark ? '#00D9FF' : '#0EA5E9',
    primaryBg: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    primaryBorder: isDark ? 'rgba(0,217,255,0.25)' : 'rgba(14,165,233,0.3)',
    inputBg: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.9)',
    userBubble: isDark ? 'rgba(0,217,255,0.1)' : 'rgba(14,165,233,0.1)',
    userBubbleBorder: isDark ? 'rgba(0,217,255,0.2)' : 'rgba(14,165,233,0.2)',
    aiBubble: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(248,250,252,0.9)',
    aiBubbleBorder: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(203,213,225,0.5)',
    sectionBg: isDark ? 'rgba(15,23,42,0.4)' : 'rgba(248,250,252,0.8)',
  };

  const quickActions: QuickAction[] = [
    { label: 'Drug Interaction Check', prompt: 'Check interactions between Warfarin, Aspirin, and Omeprazole.', icon: AlertTriangle, color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    { label: 'Sales Forecast', prompt: 'Forecast demand for antimalarials over the next 30 days based on seasonal patterns.', icon: TrendingUp, color: card.primary, bg: card.primaryBg },
    { label: 'Reorder Suggestions', prompt: 'Which products are at risk of stockout in the next 2 weeks?', icon: Package, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Prescription Analysis', prompt: 'Summarize the most commonly prescribed drug combinations this month.', icon: Pill, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Invoice Summary', prompt: 'Generate a summary of all outstanding invoices and their payment status.', icon: FileText, color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)' },
    { label: 'Financial Report', prompt: 'Create a financial report showing total payments, outstanding balances, and supplier performance.', icon: BarChart3, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await gql<{ askNexusAi: string }>(M_ASK_NEXUS_AI, { prompt: text.trim() });
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: data.askNexusAi || "I'm sorry, I couldn't get a proper clinical intelligence response. Please try again.", 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.warn('[AI Assistant] GraphQL query failed, falling back to simulated engine:', error);
      const simulated = getSimulatedResponse(text);
      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        role: 'assistant', 
        content: simulated, 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in duration-500" style={{ maxHeight: 'calc(100vh - 8rem)' }}>

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2" style={{ color: card.text }}>
            <Sparkles size={22} style={{ color: '#EC4899' }} />
            AI Assistant
          </h1>
          <p className="text-sm mt-0.5" style={{ color: card.muted }}>
            Powered by Gemini — clinical intelligence at your fingertips.
          </p>
        </div>
        <span className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full"
          style={{ background: isDark ? 'rgba(52,211,153,0.1)' : 'rgba(16,185,129,0.1)', color: isDark ? '#34D399' : '#059669', border: `1px solid ${isDark ? 'rgba(52,211,153,0.3)' : 'rgba(16,185,129,0.2)'}` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: isDark ? '#34D399' : '#059669' }} />
          NEXUS AI ONLINE
        </span>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 shrink-0">
        {quickActions.map(action => {
          const Icon = action.icon;
          return (
            <button key={action.label} onClick={() => sendMessage(action.prompt)} disabled={isLoading}
              className="rounded-xl border p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>
              <div className="p-2 rounded-lg inline-flex mb-2" style={{ background: action.bg, color: action.color }}>
                <Icon size={16} />
              </div>
              <p className="text-xs font-semibold leading-tight" style={{ color: card.text }}>{action.label}</p>
            </button>
          );
        })}
      </div>

      {/* Chat Window */}
      <div className="flex-1 rounded-2xl border backdrop-blur-xl flex flex-col overflow-hidden min-h-0"
        style={{ background: card.bg, borderColor: card.border, boxShadow: card.shadow }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                style={{
                  background: msg.role === 'assistant' ? card.primaryBg : isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${msg.role === 'assistant' ? card.primaryBorder : isDark ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.2)'}`,
                  color: msg.role === 'assistant' ? card.primary : '#F59E0B',
                }}>
                {msg.role === 'assistant' ? '✦' : 'U'}
              </div>
              {/* Bubble */}
              <div className="max-w-[75%] rounded-2xl px-4 py-3"
                style={{
                  background: msg.role === 'assistant' ? card.aiBubble : card.userBubble,
                  border: `1px solid ${msg.role === 'assistant' ? card.aiBubbleBorder : card.userBubbleBorder}`,
                  borderTopLeftRadius: msg.role === 'assistant' ? '4px' : undefined,
                  borderTopRightRadius: msg.role === 'user' ? '4px' : undefined,
                }}>
                <div 
                  className="text-sm leading-relaxed" 
                  style={{ color: card.text }}
                  dangerouslySetInnerHTML={{ __html: msg.role === 'assistant' ? formatAiResponse(msg.content) : msg.content.replace(/\n/g, '<br />') }}
                />
                <p className="text-[10px] mt-1.5" style={{ color: card.subtle }}>
                  {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold"
                style={{ background: card.primaryBg, border: `1px solid ${card.primaryBorder}`, color: card.primary }}>
                ✦
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3"
                style={{ background: card.aiBubble, border: `1px solid ${card.aiBubbleBorder}` }}>
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: card.primary, animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t" style={{ borderColor: card.border, background: card.sectionBg }}>
          <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about drug interactions, stock levels, sales trends..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all disabled:opacity-50"
              style={{
                background: card.inputBg,
                border: `1px solid ${card.border}`,
                color: card.text,
              }}
            />
            <button type="submit" disabled={!input.trim() || isLoading}
              className="p-3 rounded-xl transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: isDark ? 'linear-gradient(135deg,#00D9FF,#00A3CC)' : 'linear-gradient(135deg,#0EA5E9,#0284C7)',
                color: isDark ? '#0A0E1A' : '#fff',
                boxShadow: isDark ? '0 4px 15px rgba(0,217,255,0.3)' : '0 4px 15px rgba(14,165,233,0.3)',
              }}>
              <Send size={18} />
            </button>
          </form>
          <p className="text-[10px] mt-2 text-center" style={{ color: card.subtle }}>
            AI responses are for informational purposes. Always verify clinical decisions with a licensed pharmacist.
          </p>
        </div>
      </div>
    </div>
  );
}
