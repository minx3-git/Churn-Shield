import React, { useState, useEffect } from 'react';
import { RetentionPlaybook, Customer } from '../types';
import {
  BookOpenCheck,
  Sparkles,
  Plus,
  Play,
  CheckCircle2,
  DollarSign,
  Send,
  Target,
  Users,
  Percent,
  Copy,
  Check,
  Zap,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';

interface RetentionPlaybooksViewProps {
  customers: Customer[];
}

export const RetentionPlaybooksView: React.FC<RetentionPlaybooksViewProps> = ({ customers }) => {
  const [playbooks, setPlaybooks] = useState<RetentionPlaybook[]>([]);
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(true);

  // Playbook Creator state
  const [newTitle, setNewTitle] = useState('');
  const [targetSegment, setTargetSegment] = useState<'At-Risk' | 'Needs Attention' | 'Champions' | 'All High-Risk'>('At-Risk');
  const [riskThreshold, setRiskThreshold] = useState(65);
  const [generating, setGenerating] = useState(false);
  const [activePlaybookModal, setActivePlaybookModal] = useState<RetentionPlaybook | null>(null);

  // Fetch playbooks
  const fetchPlaybooks = async () => {
    setLoadingPlaybooks(true);
    try {
      const res = await fetch('/api/playbooks');
      const data = await res.json();
      setPlaybooks(data.playbooks || []);
    } catch (err) {
      console.error('Failed to load playbooks:', err);
    } finally {
      setLoadingPlaybooks(false);
    }
  };

  useEffect(() => {
    fetchPlaybooks();
  }, []);

  // Generate Playbook via Gemini 3.6 Flash
  const handleGeneratePlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/generate-playbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbookName: newTitle,
          targetSegment,
          riskThreshold
        })
      });
      const data = await res.json();
      if (data.playbook) {
        setPlaybooks([data.playbook, ...playbooks]);
        setNewTitle('');
      }
    } catch (err) {
      console.error('Failed to generate playbook:', err);
    } finally {
      setGenerating(false);
    }
  };

  // ROI calculation
  const highRiskCustomers = customers.filter(c => c.churnRiskScore >= 60);
  const totalArrAtRisk = highRiskCustomers.reduce((acc, c) => acc + c.monthlySpend * 12, 0);
  const avgSuccessRate = playbooks.length > 0
    ? Math.round(playbooks.reduce((acc, p) => acc + p.predictedSuccessRate, 0) / playbooks.length)
    : 72;
  const estimatedSavedArr = Math.round(totalArrAtRisk * (avgSuccessRate / 100));

  return (
    <div className="space-y-8">
      {/* CAMPAIGN ROI SUMMARY BANNER */}
      <div className="bg-gradient-to-br from-purple-700 via-indigo-700 to-purple-800 text-white rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30 inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Automated Retention Engine
            </span>
            <h2 className="text-2xl font-black tracking-tight">Active Campaign Impact & Saved Revenue</h2>
            <p className="text-xs text-purple-100 max-w-xl leading-relaxed font-medium">
              Proactive AI retention playbooks automatically trigger targeted outreach, executive calls, and billing amnesty when customer churn risk exceeds defined thresholds.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-white/10 backdrop-blur-xs p-4 rounded-xl border border-white/20 shrink-0">
            <div>
              <span className="text-[11px] text-purple-200 uppercase tracking-wider block font-bold">Avg Recovery Rate</span>
              <span className="text-2xl font-black text-emerald-300 mt-1 block">{avgSuccessRate}%</span>
            </div>
            <div>
              <span className="text-[11px] text-purple-200 uppercase tracking-wider block font-bold">Projected Saved ARR</span>
              <span className="text-2xl font-black text-white mt-1 block">${estimatedSavedArr.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI PLAYBOOK GENERATOR */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Gemini 3.6 Flash Playbook Generator</h3>
            <p className="text-xs text-slate-500">Specify target cohort parameters to automatically generate complete retention outreach campaigns</p>
          </div>
        </div>

        <form onSubmit={handleGeneratePlaybook} className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Campaign Title (Optional)</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Enterprise Q1 VIP Save"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Segment</label>
            <select
              value={targetSegment}
              onChange={(e) => setTargetSegment(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
            >
              <option value="At-Risk">At-Risk Accounts</option>
              <option value="Needs Attention">Needs Attention</option>
              <option value="Champions">Champions (Upsell)</option>
              <option value="All High-Risk">All High-Risk (Risk ≥ 70%)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Min Risk Score Trigger</span>
              <span className="text-purple-600 font-bold">{riskThreshold}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="90"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(Number(e.target.value))}
              className="w-full accent-purple-600 bg-slate-200 rounded-lg cursor-pointer mt-2"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={generating}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
            >
              <Zap className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span>{generating ? 'Generating Playbook...' : 'Generate AI Campaign'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ACTIVE PLAYBOOKS LIST */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BookOpenCheck className="w-5 h-5 text-purple-600" />
          Active Campaign Playbooks
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playbooks.map((pb) => (
            <div
              key={pb.id}
              className="bg-white border border-slate-100 hover:border-purple-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                    {pb.status}
                  </span>
                  <span className="text-xs font-bold text-purple-600 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> Trigger: ≥{pb.minRiskScore}% Risk
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm mb-2 leading-snug">{pb.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium">{pb.description}</p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5 mb-4">
                  <div className="flex justify-between text-slate-500">
                    <span>Action Type:</span>
                    <span className="text-slate-800 font-bold">{pb.actionType}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Target Segment:</span>
                    <span className="text-purple-700 font-bold">{pb.targetSegment}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Active Targeted Accounts:</span>
                    <span className="text-slate-900 font-black">{pb.activeTargetedAccounts}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">Success Rate:</span>
                  <span className="text-emerald-600 font-bold">{pb.predictedSuccessRate}%</span>
                </div>

                <button
                  onClick={() => setActivePlaybookModal(pb)}
                  className="w-full mt-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer"
                >
                  View AI Email Template & Perks
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PLAYBOOK PREVIEW MODAL */}
      {activePlaybookModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">{activePlaybookModal.title}</h3>
              <button
                onClick={() => setActivePlaybookModal(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2.5 py-1 bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-slate-500 block mb-1">Target Incentive / Perk:</span>
                <p className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 font-semibold">
                  {activePlaybookModal.aiSuggestedIncentive || 'Standard 15% discount'}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-500 block mb-1">Subject Line:</span>
                <p className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-bold text-slate-800">
                  {activePlaybookModal.aiGeneratedSubject || 'Executive Partnership Review'}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-500 block mb-1">Outreach Email Template:</span>
                <pre className="whitespace-pre-wrap font-sans bg-slate-50 text-slate-700 p-3 rounded-xl border border-slate-200 leading-relaxed text-xs font-medium">
                  {activePlaybookModal.aiGeneratedEmailBody || 'No template specified.'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
