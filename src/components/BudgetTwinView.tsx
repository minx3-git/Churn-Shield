import React, { useState, useId } from 'react';
import { Customer } from '../types';
import {
  Cpu,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Play,
  AlertCircle,
  PhoneCall,
  Percent,
  Gift,
  Sparkles,
  HelpCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
  Users,
  Award,
  SlidersHorizontal,
  Info,
  Target,
  Wallet,
  ArrowUpRight
} from 'lucide-react';

interface BudgetTwinViewProps {
  customers: Customer[];
}

type StrategyType = 'call' | 'discount' | 'perk' | 'upgrade';
type PriorityType = 'highest-value' | 'highest-risk' | 'all';

interface StrategyConfig {
  id: StrategyType;
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  costPerTarget: number;
  recoveryRate: number;
  description: string;
  bestFor: string;
  theme: {
    border: string;
    bg: string;
    badgeBg: string;
    text: string;
    ring: string;
  };
}

const STRATEGIES: StrategyConfig[] = [
  {
    id: 'call',
    title: 'Personal Executive Check-in Call',
    badge: 'VIP Account Manager',
    icon: PhoneCall,
    costPerTarget: 10,
    recoveryRate: 0.85,
    description: 'High-touch 1-on-1 phone or Zoom consultation with dedicated Customer Success lead.',
    bestFor: 'High-value Enterprise & Growth accounts facing support friction or renewal hesitation.',
    theme: {
      border: 'border-emerald-300',
      bg: 'bg-emerald-50/50',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      text: 'text-emerald-700',
      ring: 'ring-emerald-500/20'
    }
  },
  {
    id: 'discount',
    title: '15% Contract Renewal Incentive',
    badge: 'Price Relief Voucher',
    icon: Percent,
    costPerTarget: 45,
    recoveryRate: 0.72,
    description: 'Automated 15% discount voucher applied to the upcoming monthly or annual billing cycle.',
    bestFor: 'Price-sensitive customers on standard tiers or accounts with budget constraints.',
    theme: {
      border: 'border-purple-300',
      bg: 'bg-purple-50/50',
      badgeBg: 'bg-purple-100 text-purple-800',
      text: 'text-purple-700',
      ring: 'ring-purple-500/20'
    }
  },
  {
    id: 'perk',
    title: 'Loyalty Credit & Gift Pack',
    badge: '$25 Billing Credit',
    icon: Gift,
    costPerTarget: 25,
    recoveryRate: 0.68,
    description: '$25 statement credit plus custom loyalty reward package to reignite enthusiasm.',
    bestFor: 'Mid-tier accounts with declining weekly log-ins or stalled feature usage.',
    theme: {
      border: 'border-amber-300',
      bg: 'bg-amber-50/50',
      badgeBg: 'bg-amber-100 text-amber-800',
      text: 'text-amber-700',
      ring: 'ring-amber-500/20'
    }
  },
  {
    id: 'upgrade',
    title: 'Free 30-Day Pro Tier Feature Unlock',
    badge: 'Feature Boost',
    icon: Sparkles,
    costPerTarget: 15,
    recoveryRate: 0.60,
    description: 'Complimentary 30-day access to enterprise integrations, analytics, and priority queue.',
    bestFor: 'Starter accounts hitting feature ceilings who have not yet discovered higher-tier ROI.',
    theme: {
      border: 'border-indigo-300',
      bg: 'bg-indigo-50/50',
      badgeBg: 'bg-indigo-100 text-indigo-800',
      text: 'text-indigo-700',
      ring: 'ring-indigo-500/20'
    }
  }
];

export const BudgetTwinView: React.FC<BudgetTwinViewProps> = ({ customers }) => {
  // Identify at-risk customers (churnRiskScore >= 60 or category High/Critical)
  const atRiskCustomers = customers.filter(
    c => (c.churnRiskScore ?? 0) >= 60 || c.churnRiskCategory === 'Critical' || c.churnRiskCategory === 'High'
  );

  const totalAtRiskCount = atRiskCustomers.length > 0 ? atRiskCustomers.length : customers.length;
  const effectiveAtRiskList = atRiskCustomers.length > 0 ? atRiskCustomers : customers;
  const totalAtRiskMRR = effectiveAtRiskList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0);
  const baselineAvgMRR = totalAtRiskCount > 0 ? totalAtRiskMRR / totalAtRiskCount : 250;

  // Typable budget state: store as string so typing feels natural, parse as number
  const [budgetString, setBudgetString] = useState<string>('1500');
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('call');
  const [priority, setPriority] = useState<PriorityType>('highest-value');
  const [isSimulating, setIsSimulating] = useState(false);
  const [appliedSuccessMessage, setAppliedSuccessMessage] = useState<string | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [showFormulaBreakdown, setShowFormulaBreakdown] = useState(true);

  // Parse numeric budget
  const parsedBudget = Math.max(0, parseInt(budgetString.replace(/[^0-9]/g, '') || '0', 10));
  const activeStrategyObj = STRATEGIES.find(s => s.id === selectedStrategy) || STRATEGIES[0];

  // Dynamic slider range calculation (no arbitrary 2k cap!)
  // If the user types 50,000, slider scales up to 75,000!
  const fullCoverageBudget = totalAtRiskCount * activeStrategyObj.costPerTarget;
  const dynamicSliderMax = Math.max(
    10000,
    Math.ceil((parsedBudget * 1.5) / 1000) * 1000,
    Math.ceil((fullCoverageBudget * 1.1) / 1000) * 1000
  );

  // Sorting at-risk accounts based on priority
  const sortedAtRisk = [...effectiveAtRiskList].sort((a, b) => {
    if (priority === 'highest-value') {
      return (b.monthlySpend || 0) - (a.monthlySpend || 0);
    }
    if (priority === 'highest-risk') {
      return (b.churnRiskScore || 0) - (a.churnRiskScore || 0);
    }
    return 0; // neutral order
  });

  // Calculate capacity and reach
  const maxCanAfford = activeStrategyObj.costPerTarget > 0 ? Math.floor(parsedBudget / activeStrategyObj.costPerTarget) : 0;
  const targetedAccountsCount = Math.min(totalAtRiskCount, maxCanAfford);
  const isFullyCovered = maxCanAfford >= totalAtRiskCount;
  const coveragePercent = totalAtRiskCount > 0 ? Math.min(100, Math.round((targetedAccountsCount / totalAtRiskCount) * 100)) : 0;

  // Budget economics
  const effectiveBudgetSpent = targetedAccountsCount * activeStrategyObj.costPerTarget;
  const budgetSurplus = Math.max(0, parsedBudget - effectiveBudgetSpent);

  // Calculate MRR of the targeted cohort
  const targetedCohort = sortedAtRisk.slice(0, targetedAccountsCount);
  const targetedCohortMRR = targetedCohort.reduce((sum, c) => sum + (c.monthlySpend || 0), 0);
  const avgCohortMRR = targetedAccountsCount > 0 ? targetedCohortMRR / targetedAccountsCount : baselineAvgMRR;

  // Projections
  const projectedSavedCustomersCount = Math.min(
    targetedAccountsCount,
    Math.round(targetedAccountsCount * activeStrategyObj.recoveryRate)
  );
  const projectedSavedMRR = Math.round(projectedSavedCustomersCount * avgCohortMRR);
  const projectedSavedARR = projectedSavedMRR * 12;

  // Net Profit & ROI based on actual budget deployed
  const netMonthlyProfit = projectedSavedMRR - effectiveBudgetSpent;
  const roiPercentage = effectiveBudgetSpent > 0 ? Math.round((netMonthlyProfit / effectiveBudgetSpent) * 100) : 0;
  const costPerSavedCustomer = projectedSavedCustomersCount > 0 ? Math.round(effectiveBudgetSpent / projectedSavedCustomersCount) : 0;

  // Handle typed input changes
  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    setBudgetString(rawVal);
    setAppliedSuccessMessage(null);
  };

  const handlePresetClick = (amount: number) => {
    setBudgetString(amount.toString());
    setAppliedSuccessMessage(null);
  };

  const handleAutoCoverAll = () => {
    const exactRequired = totalAtRiskCount * activeStrategyObj.costPerTarget;
    setBudgetString(exactRequired.toString());
    setAppliedSuccessMessage(null);
  };

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setAppliedSuccessMessage(null);
    setTimeout(() => {
      setIsSimulating(false);
    }, 450);
  };

  const handleApplyCampaign = () => {
    setAppliedSuccessMessage(
      `Campaign Dispatched! Retention Playbook "${activeStrategyObj.title}" activated for ${targetedAccountsCount.toLocaleString()} at-risk accounts. Projected to protect $${projectedSavedMRR.toLocaleString()}/mo ($${projectedSavedARR.toLocaleString()} ARR) with a +${roiPercentage}% ROI.`
    );
  };

  // Preset button options
  const PRESETS = [
    { label: '$500', value: 500, tier: 'Starter' },
    { label: '$1,500', value: 1500, tier: 'Growth' },
    { label: '$5,000', value: 5000, tier: 'Scale' },
    { label: '$15,000', value: 15000, tier: 'Corporate' },
    { label: '$50,000', value: 50000, tier: 'Enterprise' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Digital Twin Explanation */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 lg:p-7 shadow-lg border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-3 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1.5 uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5" /> Retention Digital Twin
              </span>
              <button
                onClick={() => setShowExplainer(!showExplainer)}
                className="text-xs text-indigo-300 hover:text-white underline inline-flex items-center gap-1 font-medium cursor-pointer transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                {showExplainer ? 'Hide What is a Digital Twin?' : 'What is a Digital Twin?'}
              </button>
            </div>

            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Predictive Retention Budget Planner
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Test and forecast your customer retention spending before committing real funds. Enter any budget, choose a targeted intervention tactic, and see the exact accounts saved, protected MRR, and projected ROI.
            </p>
          </div>

          {/* At-Risk Pool Summary Box */}
          <div className="bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-700/80 shrink-0 min-w-[280px]">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                At-Risk Customer Pool
              </span>
              <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded text-[11px] font-bold">
                Live Data
              </span>
            </div>
            <div className="text-2xl font-black text-white">
              ${totalAtRiskMRR.toLocaleString()} <span className="text-xs font-medium text-slate-400">/ mo</span>
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center justify-between">
              <span>{totalAtRiskCount.toLocaleString()} vulnerable accounts</span>
              <span className="text-slate-400 font-mono">avg ${Math.round(baselineAvgMRR)}/mo</span>
            </div>
          </div>
        </div>

        {/* Collapsible Educational Guide */}
        {showExplainer && (
          <div className="mt-5 pt-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 animate-fadeIn">
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
              <span className="font-bold text-emerald-400 block mb-1 flex items-center gap-1.5">
                <Target className="w-4 h-4" /> 1. Live Cohort Modeling
              </span>
              <p className="text-slate-400 leading-normal">
                Reads every account in your database with a churn risk ≥ 60% and simulates reaching them in order of either highest revenue or urgency.
              </p>
            </div>
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
              <span className="font-bold text-purple-300 block mb-1 flex items-center gap-1.5">
                <Calculator className="w-4 h-4" /> 2. Real Unit Economics
              </span>
              <p className="text-slate-400 leading-normal">
                Applies exact marginal cost per account ($10–$45) and real-world conversion recovery rates (60%–85%) to calculate customer capacity.
              </p>
            </div>
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
              <span className="font-bold text-amber-300 block mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> 3. Transparent Return (ROI)
              </span>
              <p className="text-slate-400 leading-normal">
                Directly compares monthly subscription revenue saved against campaign costs, showing net profitability before you spend a single dollar.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Applied Success Message Banner */}
      {appliedSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl text-emerald-900 text-sm font-semibold flex items-start space-x-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-emerald-950">Retention Campaign Live!</div>
            <div className="text-xs text-emerald-800 mt-0.5">{appliedSuccessMessage}</div>
          </div>
          <button
            onClick={() => setAppliedSuccessMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-950 font-bold px-2 py-1 rounded hover:bg-emerald-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Controls (Left) vs Simulator Projections (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* STEP 1: TYPABLE BUDGET CONTROL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mb-1">
                  Step 1 of 3
                </span>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  Set Monthly Retention Budget
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type any custom amount or drag the slider. No maximum cap limit.
                </p>
              </div>
            </div>

            {/* Direct Typable Number Input */}
            <div className="space-y-3">
              <label htmlFor="budget-input" className="block text-xs font-bold text-slate-700">
                Monthly Budget Amount:
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 font-bold text-lg select-none">$</span>
                <input
                  id="budget-input"
                  type="text"
                  inputMode="numeric"
                  value={budgetString ? parseInt(budgetString, 10).toLocaleString() : ''}
                  onChange={handleBudgetInputChange}
                  placeholder="e.g. 5,000"
                  className="w-full pl-9 pr-24 py-3 bg-slate-50 border-2 border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl font-mono text-xl font-black text-slate-900 transition-all outline-none"
                />
                <span className="absolute right-3.5 text-xs font-bold text-slate-400 bg-slate-200/80 px-2 py-1 rounded">
                  USD / mo
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>Quick Presets:</span>
                  <span>Select tier to prefill</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => {
                    const isSelected = parsedBudget === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => handlePresetClick(p.value)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700'
                        }`}
                      >
                        {p.label} <span className="text-[10px] font-normal opacity-80">({p.tier})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Adaptive Slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center text-xs text-slate-500 mb-1 font-medium">
                  <span>Slider Range ($50 – ${dynamicSliderMax.toLocaleString()}):</span>
                  <span className="font-mono font-bold text-purple-700">${parsedBudget.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max={dynamicSliderMax}
                  step={parsedBudget > 10000 ? '500' : '50'}
                  value={parsedBudget}
                  onChange={(e) => {
                    setBudgetString(e.target.value);
                    setAppliedSuccessMessage(null);
                  }}
                  className="w-full accent-purple-600 bg-slate-200 rounded-lg cursor-pointer h-2.5"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>$50</span>
                  <span>${Math.round(dynamicSliderMax * 0.25).toLocaleString()}</span>
                  <span>${Math.round(dynamicSliderMax * 0.5).toLocaleString()}</span>
                  <span>${dynamicSliderMax.toLocaleString()}</span>
                </div>
              </div>

              {/* Smart Auto-Cover Button */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-purple-950 block">Auto-Cover Entire Pool:</span>
                  <span className="text-[11px] text-purple-800">
                    Need ${fullCoverageBudget.toLocaleString()} to reach all {totalAtRiskCount.toLocaleString()} accounts
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoCoverAll}
                  className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-colors"
                >
                  Set to 100%
                </button>
              </div>

              {/* Pool Coverage Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-slate-400" />
                    Target Pool Coverage:
                  </span>
                  <span className="font-bold text-slate-900">
                    {targetedAccountsCount.toLocaleString()} of {totalAtRiskCount.toLocaleString()} accounts ({coveragePercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isFullyCovered ? 'bg-emerald-500' : 'bg-purple-600'
                    }`}
                    style={{ width: `${coveragePercent}%` }}
                  />
                </div>
                {isFullyCovered && budgetSurplus > 0 && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    ✅ 100% coverage reached! You have a ${budgetSurplus.toLocaleString()} surplus not required for this tactic.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* STEP 2: COHORT PRIORITIZATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mb-1">
                  Step 2 of 3
                </span>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  Targeting Prioritization
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              When budget covers a portion of at-risk accounts, which customers should receive intervention first?
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('highest-value')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  priority === 'highest-value'
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold">Highest MRR</div>
                <div className="text-[10px] opacity-75 font-normal">Max revenue saved</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('highest-risk')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  priority === 'highest-risk'
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold">Highest Risk</div>
                <div className="text-[10px] opacity-75 font-normal">Max urgency score</div>
              </button>

              <button
                type="button"
                onClick={() => setPriority('all')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  priority === 'all'
                    ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-bold">Even Spread</div>
                <div className="text-[10px] opacity-75 font-normal">Balanced cohort</div>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between">
              <span>Targeted cohort average spend:</span>
              <span className="font-bold text-slate-900 font-mono">${Math.round(avgCohortMRR)} / mo</span>
            </div>
          </div>

          {/* STEP 3: CHOOSE RETENTION STRATEGY */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mb-1">
                Step 3 of 3
              </span>
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                Select Retention Playbook
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Each tactic has a specific unit cost and tested recovery success rate.
              </p>
            </div>

            <div className="space-y-2.5">
              {STRATEGIES.map((strat) => {
                const isSelected = selectedStrategy === strat.id;
                const IconComponent = strat.icon;
                const stratCapacity = strat.costPerTarget > 0 ? Math.min(totalAtRiskCount, Math.floor(parsedBudget / strat.costPerTarget)) : 0;
                const stratSaved = Math.round(stratCapacity * strat.recoveryRate);

                return (
                  <button
                    key={strat.id}
                    type="button"
                    onClick={() => {
                      setSelectedStrategy(strat.id);
                      setAppliedSuccessMessage(null);
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3.5 ${
                      isSelected
                        ? `${strat.theme.bg} ${strat.theme.border} ring-2 ${strat.theme.ring} shadow-xs`
                        : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 shrink-0 shadow-2xs">
                      <IconComponent className="w-5 h-5 text-slate-700" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{strat.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${strat.theme.badgeBg}`}>
                          {strat.badge}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                        {strat.description}
                      </p>

                      <div className="flex items-center gap-3 mt-2.5 text-[11px] font-medium text-slate-600 flex-wrap">
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                          Cost: <strong className="text-slate-900">${strat.costPerTarget}</strong> / customer
                        </span>
                        <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-emerald-700">
                          Recovery: <strong>{Math.round(strat.recoveryRate * 100)}%</strong>
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          Reaches {stratCapacity.toLocaleString()} accts (~{stratSaved} saved)
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center space-x-2 text-xs"
            >
              <Play className={`w-4 h-4 fill-current ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Recalculating Twin Physics...' : 'Refresh Simulator Projections'}</span>
            </button>
          </div>
        </div>

        {/* Projections Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Dark Board Results */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 rounded-2xl p-6 lg:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Digital Twin Projected Outcomes</h3>
                  <p className="text-xs text-slate-400">
                    Live simulation based on ${parsedBudget.toLocaleString()} budget &amp; {activeStrategyObj.title}
                  </p>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30">
                Simulation Ready
              </span>
            </div>

            {/* Simulated 4-Key Metric Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Revenue Saved */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 hover:border-emerald-500/40 transition-colors">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  Projected Revenue Saved
                </span>
                <span className="text-2xl font-black text-emerald-400 mt-1 block">
                  ${projectedSavedMRR.toLocaleString()} <span className="text-xs text-slate-400 font-medium">/ mo</span>
                </span>
                <span className="text-xs text-emerald-300/80 mt-1 block font-medium">
                  ${projectedSavedARR.toLocaleString()} Annual ARR protected
                </span>
              </div>

              {/* Card 2: Net Monthly Profit & ROI */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 hover:border-purple-500/40 transition-colors">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  Net Monthly Profit
                </span>
                <span className={`text-2xl font-black mt-1 block ${netMonthlyProfit >= 0 ? 'text-purple-300' : 'text-rose-400'}`}>
                  {netMonthlyProfit >= 0 ? `+$${netMonthlyProfit.toLocaleString()}` : `-$${Math.abs(netMonthlyProfit).toLocaleString()}`}
                  <span className="text-xs text-slate-400 font-medium"> / mo</span>
                </span>
                <span className="text-xs text-emerald-400 mt-1 block font-bold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {roiPercentage}% Return on Investment (ROI)
                </span>
              </div>

              {/* Card 3: Customers Recovered */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  Accounts Retained
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {projectedSavedCustomersCount.toLocaleString()} Accounts
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Targeting {targetedAccountsCount.toLocaleString()} at-risk accounts ({Math.round(activeStrategyObj.recoveryRate * 100)}% recovery)
                </span>
              </div>

              {/* Card 4: Cost per Saved Account */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                  Unit Cost per Account Saved
                </span>
                <span className="text-2xl font-black text-white mt-1 block">
                  ${costPerSavedCustomer} <span className="text-xs text-slate-400 font-medium">/ customer</span>
                </span>
                <span className="text-xs text-slate-400 mt-1 block">
                  Spent ${effectiveBudgetSpent.toLocaleString()} of ${parsedBudget.toLocaleString()} budget
                </span>
              </div>
            </div>

            {/* Clear Plain-English Explainer */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 text-xs text-slate-200 leading-relaxed space-y-2">
              <span className="font-bold text-white block text-xs flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                Executive Summary for Business Leaders:
              </span>
              <p>
                By allocating <strong className="text-purple-300 font-mono">${parsedBudget.toLocaleString()}</strong> to the{' '}
                <strong className="text-white">{activeStrategyObj.title}</strong>, your digital twin models reaching{' '}
                <strong className="text-white">{targetedAccountsCount.toLocaleString()}</strong> vulnerable accounts at{' '}
                <strong className="text-white">${activeStrategyObj.costPerTarget}/account</strong>. With an expected {Math.round(activeStrategyObj.recoveryRate * 100)}% retention rate, you will prevent{' '}
                <strong className="text-emerald-400">{projectedSavedCustomersCount.toLocaleString()} customers</strong> from churning, retaining{' '}
                <strong className="text-emerald-400 font-mono">${projectedSavedMRR.toLocaleString()}/month</strong> in recurring cash flow. After deducting campaign costs (${effectiveBudgetSpent.toLocaleString()}), you yield a net monthly gain of{' '}
                <strong className="text-purple-300 font-mono">+{netMonthlyProfit.toLocaleString()}</strong> (a <strong className="text-emerald-400">+{roiPercentage}% ROI</strong>).
              </p>
            </div>

            {/* Deploy Action Button */}
            <button
              type="button"
              onClick={handleApplyCampaign}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/40 cursor-pointer flex items-center justify-center space-x-2 text-sm tracking-wide"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Deploy {activeStrategyObj.title} to {targetedAccountsCount.toLocaleString()} Accounts</span>
            </button>
          </div>

          {/* STEP-BY-STEP TRANSPARENT FORMULA BREAKDOWN (UNDERSTAND THE MATH) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">How the Math Works (Step-by-Step)</h4>
                  <p className="text-[11px] text-slate-500">Every calculation is open and transparent</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowFormulaBreakdown(!showFormulaBreakdown)}
                className="text-xs text-purple-700 font-bold hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                {showFormulaBreakdown ? (
                  <>Hide Details <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Show Formula <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {showFormulaBreakdown && (
              <div className="space-y-3 text-xs">
                {/* Step A: Reach */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>1. Accounts Reached (Capacity)</span>
                    <span className="font-mono text-purple-700">{targetedAccountsCount.toLocaleString()} accounts</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formula: <code className="bg-white px-1.5 py-0.5 rounded text-slate-700">Budget (${parsedBudget.toLocaleString()}) ÷ Unit Cost (${activeStrategyObj.costPerTarget}) = {maxCanAfford.toLocaleString()} capacity</code>.
                    {maxCanAfford > totalAtRiskCount
                      ? ` Capped at your total pool of ${totalAtRiskCount.toLocaleString()} accounts.`
                      : ` Limited by your current budget.`}
                  </p>
                </div>

                {/* Step B: Retained */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>2. Accounts Retained (Success Rate)</span>
                    <span className="font-mono text-emerald-700">{projectedSavedCustomersCount.toLocaleString()} saved</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formula: <code className="bg-white px-1.5 py-0.5 rounded text-slate-700">{targetedAccountsCount.toLocaleString()} targeted × {Math.round(activeStrategyObj.recoveryRate * 100)}% recovery rate = {projectedSavedCustomersCount.toLocaleString()} accounts prevented from churning</code>.
                  </p>
                </div>

                {/* Step C: Saved MRR */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>3. Protected Monthly Recurring Revenue</span>
                    <span className="font-mono text-emerald-700">${projectedSavedMRR.toLocaleString()}/mo</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formula: <code className="bg-white px-1.5 py-0.5 rounded text-slate-700">{projectedSavedCustomersCount.toLocaleString()} saved accounts × avg spend ${Math.round(avgCohortMRR)}/mo = ${projectedSavedMRR.toLocaleString()}/mo (${projectedSavedARR.toLocaleString()} ARR)</code>.
                  </p>
                </div>

                {/* Step D: Net Profit & ROI */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span>4. Net Profit &amp; ROI</span>
                    <span className="font-mono text-purple-700">+{roiPercentage}% Return</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formula: <code className="bg-white px-1.5 py-0.5 rounded text-slate-700">Saved MRR (${projectedSavedMRR.toLocaleString()}) - Budget Spent (${effectiveBudgetSpent.toLocaleString()}) = Net Profit (+${netMonthlyProfit.toLocaleString()})</code>.
                    Then <code className="bg-white px-1.5 py-0.5 rounded text-slate-700">(${netMonthlyProfit.toLocaleString()} ÷ ${effectiveBudgetSpent.toLocaleString()}) × 100 = {roiPercentage}% ROI</code>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* SIDE-BY-SIDE STRATEGY COMPARISON TABLE (MAKE WHOLE THING UNDERSTANDABLE) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900">Compare All 4 Tactics with Your ${parsedBudget.toLocaleString()} Budget</h4>
                <p className="text-[11px] text-slate-500">See which strategy delivers the highest return</p>
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                Click any row to test
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Tactic</th>
                    <th className="py-2.5 px-2 text-right">Cost/Acct</th>
                    <th className="py-2.5 px-2 text-right">Recovery</th>
                    <th className="py-2.5 px-2 text-right">Accounts Saved</th>
                    <th className="py-2.5 px-2 text-right">Saved MRR</th>
                    <th className="py-2.5 px-2 text-right">Net Profit</th>
                    <th className="py-2.5 px-3 text-right">ROI %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {STRATEGIES.map((strat) => {
                    const isSelected = selectedStrategy === strat.id;
                    const capacity = strat.costPerTarget > 0 ? Math.min(totalAtRiskCount, Math.floor(parsedBudget / strat.costPerTarget)) : 0;
                    const saved = Math.round(capacity * strat.recoveryRate);
                    const spent = capacity * strat.costPerTarget;
                    const savedMRR = Math.round(saved * avgCohortMRR);
                    const profit = savedMRR - spent;
                    const roi = spent > 0 ? Math.round((profit / spent) * 100) : 0;

                    // Highlighting top ROI
                    const isBestROI = strat.id === 'call';

                    return (
                      <tr
                        key={strat.id}
                        onClick={() => {
                          setSelectedStrategy(strat.id);
                          setAppliedSuccessMessage(null);
                        }}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-purple-50/80 font-bold text-purple-950'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="py-3 px-3 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-purple-600' : 'bg-slate-300'}`} />
                          <div>
                            <span className="block font-bold">{strat.title}</span>
                            <span className="text-[10px] text-slate-400 font-normal">{strat.badge}</span>
                          </div>
                          {isBestROI && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black ml-1">
                              Top ROI
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right font-mono">${strat.costPerTarget}</td>
                        <td className="py-3 px-2 text-right font-mono">{Math.round(strat.recoveryRate * 100)}%</td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-slate-900">{saved}</td>
                        <td className="py-3 px-2 text-right font-mono text-emerald-700 font-bold">${savedMRR.toLocaleString()}</td>
                        <td className="py-3 px-2 text-right font-mono font-bold text-purple-700">
                          {profit >= 0 ? `+$${profit.toLocaleString()}` : `-$${Math.abs(profit).toLocaleString()}`}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900">
                          +{roi}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
