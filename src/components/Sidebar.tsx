import React from 'react';
import { LayoutDashboard, MessageSquareText, Cpu, AlertTriangle, Users, Upload } from 'lucide-react';

export type TabType = 'dashboard' | 'ai-chat' | 'budget-twin' | 'churn-prediction' | 'customer-clusters';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  highRiskCount: number;
  totalCustomersCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  highRiskCount,
  totalCustomersCount
}) => {
  const navItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
      badge: null,
      description: 'Business Health & Urgent Actions'
    },
    {
      id: 'ai-chat' as TabType,
      label: 'AI Business Chatbot',
      icon: MessageSquareText,
      badge: 'AI Advisor',
      badgeColor: 'bg-purple-100 text-purple-700 border-purple-200',
      description: 'Ask questions & get advice'
    },
    {
      id: 'budget-twin' as TabType,
      label: 'Budget Planner & Twin',
      icon: Cpu,
      badge: 'Simulator',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Simulate retention spending & ROI'
    },
    {
      id: 'churn-prediction' as TabType,
      label: 'Churn Prediction & Upload',
      icon: AlertTriangle,
      badge: highRiskCount > 0 ? `${highRiskCount.toLocaleString()} At Risk` : null,
      badgeColor: 'bg-rose-50 text-rose-600 border-rose-200',
      description: 'Upload CSV & AI Recommendations'
    },
    {
      id: 'customer-clusters' as TabType,
      label: 'Customer Clusters',
      icon: Users,
      badge: `${totalCustomersCount.toLocaleString()} Total`,
      description: 'Group customers into smart segments'
    }
  ];

  return (
    <aside className="w-full lg:w-64 bg-white border-r border-slate-200 p-4 shrink-0 flex flex-col justify-between">
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3 mt-1">
          Business Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-start space-x-3 px-3 py-2.5 rounded-xl transition-all text-left cursor-pointer group ${
                isActive
                  ? 'bg-purple-50 border border-purple-200/80 text-purple-700 font-medium shadow-xs'
                  : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div
                className={`p-2 rounded-lg mt-0.5 shrink-0 transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold truncate ${isActive ? 'text-purple-700' : 'text-slate-700'}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer Simple Status Card */}
      <div className="mt-8 pt-4 border-t border-slate-100">
        <div className="bg-gradient-to-br from-purple-700 to-indigo-800 rounded-xl p-3.5 text-white shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="flex items-center gap-1.5 text-purple-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              AI Co-Pilot Ready
            </span>
            <span className="text-purple-200 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Small Biz Mode</span>
          </div>
          <p className="text-[11px] text-purple-100/90 leading-snug mt-1 font-medium">
            Smart, easy-to-use retention tools designed for small business growth.
          </p>
        </div>
      </div>
    </aside>
  );
};

