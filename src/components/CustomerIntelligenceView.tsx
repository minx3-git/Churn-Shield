import React, { useState } from 'react';
import { Customer, CohortRetentionData, RiskCategory, SegmentType } from '../types';
import { COHORT_DATA } from '../data/mockData';
import {
  Users,
  Search,
  Filter,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Mail,
  Calendar,
  DollarSign,
  Clock,
  Ticket,
  Copy,
  Check,
  TrendingDown,
  X,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

interface CustomerIntelligenceViewProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (c: Customer | null) => void;
  onDeleteCustomer: (id: string) => void;
  searchQuery: string;
}

export const CustomerIntelligenceView: React.FC<CustomerIntelligenceViewProps> = ({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onDeleteCustomer,
  searchQuery
}) => {
  const [segmentFilter, setSegmentFilter] = useState<string>('All');
  const [riskFilter, setRiskFilter] = useState<string>('All');
  const [planFilter, setPlanFilter] = useState<string>('All');

  // AI Win-back strategy modal state
  const [aiStrategy, setAiStrategy] = useState<{
    aiAnalysis?: string;
    recommendedIncentive?: string;
    winBackEmail?: { subject: string; body: string };
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Filter customers logic
  const filteredCustomers = customers.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSegment = segmentFilter === 'All' || c.segment === segmentFilter;
    const matchesRisk = riskFilter === 'All' || c.churnRiskCategory === riskFilter;
    const matchesPlan = planFilter === 'All' || c.plan === planFilter;

    return matchesSearch && matchesSegment && matchesRisk && matchesPlan;
  });

  // Handle Gemini Strategy request for modal customer
  const handleGenerateAiStrategy = async (customer: Customer) => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/customer-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id })
      });
      const data = await res.json();
      setAiStrategy(data);
    } catch (err) {
      console.error('Failed to get customer AI strategy:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const copyEmailToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* TOOLBAR FILTERS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Filter Cohort:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 flex-1 max-w-2xl">
            {/* Segment Filter */}
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="All">All Segments</option>
              <option value="Champions">Champions</option>
              <option value="Loyal">Loyal</option>
              <option value="Needs Attention">Needs Attention</option>
              <option value="At-Risk">At-Risk</option>
            </select>

            {/* Risk Tier Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="All">All Risk Tiers</option>
              <option value="Critical">Critical Risk (≥75%)</option>
              <option value="High">High Risk (60-74%)</option>
              <option value="Medium">Medium Risk (35-59%)</option>
              <option value="Low">Low Risk (&lt;35%)</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 col-span-2 sm:col-span-1"
            >
              <option value="All">All Plan Tiers</option>
              <option value="Enterprise">Enterprise</option>
              <option value="Growth">Growth</option>
              <option value="Starter">Starter</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <strong className="text-slate-900">{filteredCustomers.length}</strong> of {customers.length} accounts
          </div>
        </div>
      </div>

      {/* CUSTOMER DIRECTORY TABLE */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Monitored Customer Accounts
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-400 tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Account & Contact</th>
                <th className="py-3 px-4">Plan & MRR</th>
                <th className="py-3 px-4">Inactivity & Tickets</th>
                <th className="py-3 px-4">Risk Category</th>
                <th className="py-3 px-4">Primary Risk Factor</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={cust.avatar}
                          alt={cust.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{cust.company}</span>
                          <span className="text-[11px] text-slate-500">{cust.name} • {cust.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{cust.plan}</span>
                      <span className="text-[11px] text-purple-700 font-bold font-mono">${cust.monthlySpend}/mo</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-[11px] space-y-0.5">
                        <span className={cust.lastLoginDaysAgo > 14 ? 'text-rose-600 font-bold block' : 'text-slate-600 block'}>
                          {cust.lastLoginDaysAgo} days inactive
                        </span>
                        <span className={cust.supportTickets >= 5 ? 'text-amber-600 font-semibold block' : 'text-slate-500 block'}>
                          {cust.supportTickets} support tickets
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md border text-[11px] ${
                            cust.churnRiskCategory === 'Critical'
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : cust.churnRiskCategory === 'High'
                              ? 'bg-orange-50 text-orange-600 border-orange-200'
                              : cust.churnRiskCategory === 'Medium'
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          {cust.churnRiskScore}% Risk
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate font-medium">
                      {cust.primaryRiskFactor}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectCustomer(cust);
                          setAiStrategy(null);
                        }}
                        className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Inspect & AI Strategy
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-sm">
                    No accounts matching the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COHORT RETENTION HEATMAP */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Cohort Retention Matrix (% Retained Over Time)
          </h3>
          <p className="text-xs text-slate-500">Track monthly retention decay rates across historical user cohorts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-slate-50 uppercase text-[10px] text-slate-400 font-bold border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3 text-left">Cohort Month</th>
                <th className="py-2.5 px-3">Size</th>
                <th className="py-2.5 px-3">Month 1</th>
                <th className="py-2.5 px-3">Month 2</th>
                <th className="py-2.5 px-3">Month 3</th>
                <th className="py-2.5 px-3">Month 4</th>
                <th className="py-2.5 px-3">Month 5</th>
                <th className="py-2.5 px-3">Month 6</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {COHORT_DATA.map((cohort, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-left font-bold text-slate-900">{cohort.cohort}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono font-medium">{cohort.initialSize}</td>
                  {cohort.retentionRates.map((rate, mIdx) => {
                    let bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    if (rate < 80) bg = 'bg-rose-50 text-rose-700 border-rose-200';
                    else if (rate < 90) bg = 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <td key={mIdx} className="py-2 px-2">
                        <span className={`inline-block w-full py-1.5 rounded-lg border font-bold text-xs ${bg}`}>
                          {rate}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAILED CUSTOMER STRATEGY MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative my-8">
            <button
              onClick={() => {
                onSelectCustomer(null);
                setAiStrategy(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start space-x-4 border-b border-slate-100 pb-4">
              <img
                src={selectedCustomer.avatar}
                alt={selectedCustomer.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-purple-600"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-bold text-slate-900">{selectedCustomer.company}</h3>
                  <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2.5 py-0.5 rounded-md font-bold">
                    {selectedCustomer.plan} Plan
                  </span>
                </div>
                <p className="text-xs text-slate-500">{selectedCustomer.name} • {selectedCustomer.email}</p>
                <div className="flex items-center space-x-3 text-xs mt-2 text-slate-600">
                  <span>MRR: <strong className="text-purple-700 font-mono">${selectedCustomer.monthlySpend}</strong></span>
                  <span>Tenure: <strong className="text-slate-900">{selectedCustomer.tenureMonths} mos</strong></span>
                  <span>Risk Score: <strong className="text-rose-600">{selectedCustomer.churnRiskScore}%</strong></span>
                </div>
              </div>
            </div>

            {/* Core Metrics & Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[11px]">Key Behavioral Indicators</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Login:</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.lastLoginDaysAgo} days ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Support Tickets:</span>
                  <span className="font-semibold text-rose-600">{selectedCustomer.supportTickets} open</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">NPS Rating:</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.npsScore}/10</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Usage Score:</span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.usageScore}/100</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <span className="font-bold text-slate-400 uppercase tracking-wider block text-[11px]">Primary Churn Driver</span>
                <p className="text-rose-600 font-bold">{selectedCustomer.primaryRiskFactor}</p>
                <p className="text-slate-500 text-[11px] leading-relaxed mt-2">{selectedCustomer.notes || 'No specific notes recorded.'}</p>
              </div>
            </div>

            {/* AI Retention Strategy Section */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h4 className="font-bold text-sm text-purple-900">Gemini 3.6 Flash Retention Advisor</h4>
                </div>
                <button
                  onClick={() => handleGenerateAiStrategy(selectedCustomer)}
                  disabled={loadingAi}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loadingAi ? 'Generating Strategy...' : 'Generate Win-Back Campaign'}
                </button>
              </div>

              {aiStrategy ? (
                <div className="space-y-4 text-xs text-slate-700">
                  <div className="bg-white p-3 rounded-xl border border-purple-100 shadow-xs">
                    <span className="font-bold text-purple-700 block mb-1">AI Root Cause Analysis:</span>
                    <p className="leading-relaxed text-slate-600">{aiStrategy.aiAnalysis}</p>
                  </div>

                  {aiStrategy.recommendedIncentive && (
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-emerald-800 font-semibold">
                      <strong>Recommended Retention Perk:</strong> {aiStrategy.recommendedIncentive}
                    </div>
                  )}

                  {aiStrategy.winBackEmail && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 text-xs">Generated Win-Back Email Draft</span>
                        <button
                          onClick={() => copyEmailToClipboard(aiStrategy.winBackEmail!.body)}
                          className="flex items-center space-x-1 text-purple-700 hover:text-purple-800 font-bold cursor-pointer text-xs"
                        >
                          {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedEmail ? 'Copied!' : 'Copy Body'}</span>
                        </button>
                      </div>
                      <p className="font-bold text-slate-800">Subject: {aiStrategy.winBackEmail.subject}</p>
                      <pre className="whitespace-pre-wrap font-sans text-slate-600 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                        {aiStrategy.winBackEmail.body}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2 font-medium">
                  Click "Generate Win-Back Campaign" to create a tailored executive recovery plan with personalized email copy.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
