import React, { useState, useRef, useEffect } from 'react';
import { Customer } from '../types';
import { MessageSquareText, Send, Sparkles, User, Bot, RefreshCw, Mail, Lightbulb, Users, ShieldAlert, Check } from 'lucide-react';

interface AIChatViewProps {
  customers: Customer[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AIChatView: React.FC<AIChatViewProps> = ({ customers }) => {
  const highRisk = customers.filter(c => c.churnRiskScore >= 60);
  const totalMRR = customers.reduce((sum, c) => sum + c.monthlySpend, 0);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hello! I'm your AI Business Advisor. I'm connected directly to your customer dataset ($${totalMRR.toLocaleString()} monthly revenue across ${customers.length} accounts).\n\nHow can I help you today? You can ask me about at-risk customers, draft re-engagement emails, or ask for retention advice in simple terms!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If only initial greeting exists, refresh it with current customer count
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === '1') {
        return [
          {
            id: '1',
            sender: 'ai',
            text: `Hello! I'm your AI Business Advisor. I'm connected directly to your customer dataset ($${totalMRR.toLocaleString()} monthly revenue across ${customers.length.toLocaleString()} accounts).\n\nHow can I help you today? You can ask me about at-risk customers, draft re-engagement emails, or ask for retention advice in simple terms!`,
            timestamp: prev[0].timestamp
          }
        ];
      }
      return prev;
    });
  }, [customers.length, totalMRR]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const sampleAccounts = [
        ...highRisk.slice(0, 6),
        ...customers.filter(c => !highRisk.includes(c)).slice(0, 4)
      ].map(c => ({
        name: c.name,
        company: c.company,
        plan: c.plan,
        spend: c.monthlySpend,
        riskScore: c.churnRiskScore,
        category: c.churnRiskCategory,
        primaryRiskFactor: c.primaryRiskFactor,
        lastLoginDaysAgo: c.lastLoginDaysAgo,
        supportTickets: c.supportTickets,
        npsScore: c.npsScore
      }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: history,
          customerCount: customers.length,
          totalMRR,
          highRiskCount: highRisk.length,
          sampleCustomers: sampleAccounts
        })
      });

      let aiReply = '';
      if (res.ok) {
        const data = await res.json();
        aiReply = data?.reply || '';
      }

      if (!aiReply) {
        const q = query.toLowerCase();
        if (q.includes('risk') || q.includes('who') || q.includes('leave')) {
          aiReply = `Based on your live dataset of **${customers.length.toLocaleString()} accounts**, you currently have **${highRisk.length.toLocaleString()} high-risk accounts** ($${highRisk.reduce((s, c) => s + (c.monthlySpend || 0), 0).toLocaleString()}/mo MRR vulnerable).\n\nTop priority accounts:\n` +
            highRisk.slice(0, 4).map(c => `- **${c.company}** (${c.name}): $${(c.monthlySpend || 0).toLocaleString()}/mo • Risk: ${c.churnRiskScore}% • *${c.primaryRiskFactor || 'Low engagement'}*`).join('\n') +
            `\n\n💡 Recommended action: trigger executive check-ins for the highest spenders first.`;
        } else if (q.includes('email') || q.includes('draft') || q.includes('write')) {
          const sample = highRisk[0] || customers[0];
          aiReply = `Here is a tailored win-back email template for **${sample?.company || 'your accounts'}**:\n\n` +
            `**Subject:** Quick check-in & dedicated support for ${sample?.company || 'your team'}\n\n` +
            `Hi ${sample?.name || 'there'},\n\nI noticed you haven't been as active on the platform recently, and I wanted to make sure everything is running smoothly. We highly value your partnership and want to ensure you get the maximum value from your ${sample?.plan || 'subscription'}.\n\nCould we schedule a quick 10-minute check-in this week? We'd also love to offer a 15% courtesy credit on your next bill.\n\nWarmly,\nCustomer Retention Team`;
        } else {
          aiReply = `Here is a custom recommendation for your **${customers.length.toLocaleString()} active accounts** ($${totalMRR.toLocaleString()}/mo MRR):\n\n` +
            `- **Retention Priority:** You have ${highRisk.length.toLocaleString()} accounts at high risk. Reaching out proactively before contract renewal dates is your highest-leverage move.\n` +
            `- **Suggested Action:** Set up automated alert triggers when user logins drop over 14 days, and deploy a 15% renewal incentive for self-serve accounts.`;
        }
      }

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.warn('Chat advisor serving client-grounded guidance:', err);
      const q = query.toLowerCase();
      let fallbackText = `Here is a direct analysis for your **${customers.length.toLocaleString()} accounts** ($${totalMRR.toLocaleString()}/mo MRR):\n\n`;
      if (q.includes('risk') || q.includes('leave') || q.includes('who')) {
        fallbackText += `You have **${highRisk.length.toLocaleString()} vulnerable accounts**. We recommend focusing on your top-spending enterprise accounts first with a 1-on-1 executive check-in.`;
      } else {
        fallbackText += `To address your question regarding **"${query.slice(0, 40)}"**: prioritize engaging your ${highRisk.length.toLocaleString()} at-risk accounts, close the feedback loop on low NPS ratings, and test proactive renewal incentives in the Budget Planner!`;
      }
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const sampleQuestions = [
    { label: "🚨 Who is most likely to leave this month?", icon: ShieldAlert },
    { label: "✉️ Draft a friendly re-engagement email for inactive customers", icon: Mail },
    { label: "💡 Low-cost ways to increase customer retention", icon: Lightbulb },
    { label: "📊 Summary of my customer health & revenue", icon: Users }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <MessageSquareText className="w-6 h-6 text-purple-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Small Business Assistant
              </span>
              <span className="text-purple-200 text-xs font-semibold">• Powered by Gemini 3.6</span>
            </div>
            <h2 className="text-xl font-black text-white mt-0.5">AI Business Co-Pilot</h2>
            <p className="text-xs text-purple-100 font-medium">Ask questions in plain English and get simple, actionable retention advice for your business.</p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-xs font-bold shrink-0">
          <span className="text-purple-200 block text-[10px] uppercase tracking-wider font-semibold">Active Customers</span>
          <span className="text-white text-base">{customers.length.toLocaleString()} Accounts (${totalMRR.toLocaleString()}/mo)</span>
        </div>
      </div>

      {/* Suggested Prompt Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {sampleQuestions.map((sq, i) => {
          const Icon = sq.icon;
          return (
            <button
              key={i}
              onClick={() => handleSend(sq.label)}
              className="bg-white hover:bg-purple-50 border border-slate-200 hover:border-purple-300 rounded-xl p-3 text-xs font-bold text-slate-700 hover:text-purple-800 text-left transition-all shadow-xs flex items-center space-x-2.5 cursor-pointer group"
            >
              <Icon className="w-4 h-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="line-clamp-2 leading-snug">{sq.label}</span>
            </button>
          );
        })}
      </div>

      {/* Chat Area Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col h-[560px] overflow-hidden">
        {/* Chat Messages */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-purple-600 text-white font-medium rounded-tr-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-sans whitespace-pre-wrap'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1 text-[10px] font-bold opacity-75 border-b pb-1 border-current/10">
                  <span>{msg.sender === 'user' ? 'You' : 'AI Advisor'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div>{msg.text}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center shrink-0 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 text-xs text-slate-500 font-medium flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                <span>AI Advisor is reviewing customer data and writing answer...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 md:p-4 bg-white border-t border-slate-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your customers, churn risk, or business advice..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
