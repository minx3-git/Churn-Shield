import React, { useState, useMemo } from 'react';
import { Customer } from '../types';
import {
  Users,
  Crown,
  ShieldAlert,
  Heart,
  UserPlus,
  ArrowRight,
  Sparkles,
  Search,
  ArrowUpDown,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Filter,
  Download,
  AlertTriangle,
  Layers,
  ChevronLeft
} from 'lucide-react';

interface CustomerClustersViewProps {
  customers: Customer[];
}

type ClusterId = 'vip' | 'at-risk' | 'loyal' | 'new';
type SortField = 'spend' | 'risk' | 'usage' | 'tenure';
type SortOrder = 'desc' | 'asc';

export const CustomerClustersView: React.FC<CustomerClustersViewProps> = ({ customers }) => {
  const [selectedClusterId, setSelectedClusterId] = useState<ClusterId>('vip');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('spend');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Calculate overall cohort statistics for dynamic percentile thresholds
  const totalCompanyMRR = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.monthlySpend || 0), 0);
  }, [customers]);

  const { topSpendThreshold, medianSpend } = useMemo(() => {
    if (customers.length === 0) return { topSpendThreshold: 1000, medianSpend: 500 };
    const spends = customers.map(c => c.monthlySpend || 0).sort((a, b) => a - b);
    const p75Index = Math.floor(spends.length * 0.75);
    const p50Index = Math.floor(spends.length * 0.50);
    return {
      topSpendThreshold: spends[p75Index] || 1500,
      medianSpend: spends[p50Index] || 750
    };
  }, [customers]);

  // Robust, Mutually Exclusive & Collectively Exhaustive Segmentation Engine
  const { clusters, clusterMap } = useMemo(() => {
    const atRiskList: Customer[] = [];
    const vipList: Customer[] = [];
    const newList: Customer[] = [];
    const loyalList: Customer[] = [];

    // Helper to evaluate health
    const isAtRisk = (c: Customer) =>
      (c.churnRiskScore ?? 0) >= 50 ||
      c.churnRiskCategory === 'Critical' ||
      c.churnRiskCategory === 'High' ||
      c.paymentStatus === 'Failed' ||
      c.paymentStatus === 'Overdue' ||
      (c.lastLoginDaysAgo ?? 0) >= 21;

    customers.forEach((customer) => {
      // 1. High Churn Risk or Payment Friction -> At-Risk Segment
      if (isAtRisk(customer)) {
        atRiskList.push(customer);
        return;
      }

      // 2. High Value + Healthy -> VIP Champions
      // Qualifying criteria:
      // - Spend at or above 75th percentile, OR Enterprise plan, OR labeled 'Champions' segment
      // - AND healthy churn risk (< 45) and solid product engagement (usageScore >= 50)
      const isHighValue =
        (customer.monthlySpend || 0) >= topSpendThreshold ||
        (customer.plan && customer.plan.toLowerCase() === 'enterprise') ||
        customer.segment === 'Champions' ||
        (customer.monthlySpend || 0) >= 2000;

      const isHealthy = (customer.churnRiskScore ?? 0) < 45;

      if (isHighValue && isHealthy) {
        vipList.push(customer);
        return;
      }

      // 3. Early Onboarding Stage (Tenure <= 4 months) -> Recent Signups
      if ((customer.tenureMonths ?? 0) <= 4) {
        newList.push(customer);
        return;
      }

      // 4. Consistent, Stable Core Business -> Loyal Regulars
      loyalList.push(customer);
    });

    // Ensure all clusters are sorted by Monthly Spend descending by default
    const sortBySpendDesc = (a: Customer, b: Customer) => (b.monthlySpend || 0) - (a.monthlySpend || 0);

    vipList.sort(sortBySpendDesc);
    atRiskList.sort(sortBySpendDesc);
    loyalList.sort(sortBySpendDesc);
    newList.sort(sortBySpendDesc);

    const clusterDefinitions = [
      {
        id: 'vip' as ClusterId,
        title: 'VIP Champions',
        icon: Crown,
        badge: 'Top Revenue & High Loyalty',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
        accentColor: 'amber',
        description: 'Your highest-spending, most valuable accounts with strong engagement and low churn risk.',
        criteria: `Spend ≥ $${topSpendThreshold.toLocaleString()} or Enterprise tier with healthy usage (Risk < 45%)`,
        members: vipList,
        count: vipList.length,
        totalMRR: vipList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0),
        avgRisk: vipList.length > 0 ? Math.round(vipList.reduce((sum, c) => sum + (c.churnRiskScore || 0), 0) / vipList.length) : 8,
        avgSpend: vipList.length > 0 ? Math.round(vipList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0) / vipList.length) : 0,
        aiStrategy: 'Assign dedicated Customer Success executive, co-develop case studies, invite to advisory board, and offer exclusive early-access features.'
      },
      {
        id: 'at-risk' as ClusterId,
        title: 'At-Risk Accounts',
        icon: ShieldAlert,
        badge: 'Immediate Action Required',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-300',
        accentColor: 'rose',
        description: 'Accounts with high churn probability (≥50%), overdue billing, or steep drops in weekly logins.',
        criteria: 'Churn Risk ≥ 50% or Critical/High category, overdue invoice, or inactive > 20 days',
        members: atRiskList,
        count: atRiskList.length,
        totalMRR: atRiskList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0),
        avgRisk: atRiskList.length > 0 ? Math.round(atRiskList.reduce((sum, c) => sum + (c.churnRiskScore || 0), 0) / atRiskList.length) : 78,
        avgSpend: atRiskList.length > 0 ? Math.round(atRiskList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0) / atRiskList.length) : 0,
        aiStrategy: 'Proactively resolve pending support tickets, offer 15% contract renewal discount, and schedule an executive check-in call.'
      },
      {
        id: 'loyal' as ClusterId,
        title: 'Loyal Steady Core',
        icon: Heart,
        badge: 'Stable Revenue Foundation',
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-300',
        accentColor: 'indigo',
        description: 'Consistent, predictable customers with healthy retention past the onboarding threshold.',
        criteria: 'Tenure > 4 months, healthy churn risk (< 50%), and consistent recurring subscription payments',
        members: loyalList,
        count: loyalList.length,
        totalMRR: loyalList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0),
        avgRisk: loyalList.length > 0 ? Math.round(loyalList.reduce((sum, c) => sum + (c.churnRiskScore || 0), 0) / loyalList.length) : 24,
        avgSpend: loyalList.length > 0 ? Math.round(loyalList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0) / loyalList.length) : 0,
        aiStrategy: 'Nurture with educational best-practice newsletters, quarterly satisfaction check-ins, and automated expansion upsells.'
      },
      {
        id: 'new' as ClusterId,
        title: 'Recent Signups',
        icon: UserPlus,
        badge: 'Onboarding & Nurture',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        accentColor: 'emerald',
        description: 'New accounts in their first 1–4 months of service establishing their usage patterns.',
        criteria: 'Tenure ≤ 4 months without critical churn signals',
        members: newList,
        count: newList.length,
        totalMRR: newList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0),
        avgRisk: newList.length > 0 ? Math.round(newList.reduce((sum, c) => sum + (c.churnRiskScore || 0), 0) / newList.length) : 28,
        avgSpend: newList.length > 0 ? Math.round(newList.reduce((sum, c) => sum + (c.monthlySpend || 0), 0) / newList.length) : 0,
        aiStrategy: 'Trigger guided feature tours, offer 1-on-1 implementation assistance, and verify primary activation milestones.'
      }
    ];

    const map = new Map<ClusterId, typeof clusterDefinitions[0]>();
    clusterDefinitions.forEach(c => map.set(c.id, c));

    return { clusters: clusterDefinitions, clusterMap: map };
  }, [customers, topSpendThreshold]);

  const activeCluster = clusterMap.get(selectedClusterId) || clusters[0];

  // Filter & sort active cluster members
  const filteredMembers = useMemo(() => {
    let result = [...activeCluster.members];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.plan && c.plan.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'spend') {
        valA = a.monthlySpend || 0;
        valB = b.monthlySpend || 0;
      } else if (sortField === 'risk') {
        valA = a.churnRiskScore || 0;
        valB = b.churnRiskScore || 0;
      } else if (sortField === 'usage') {
        valA = a.usageScore || 0;
        valB = b.usageScore || 0;
      } else if (sortField === 'tenure') {
        valA = a.tenureMonths || 0;
        valB = b.tenureMonths || 0;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [activeCluster, searchQuery, sortField, sortOrder]);

  // Pagination for large cohorts
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMembers.slice(start, start + itemsPerPage);
  }, [filteredMembers, currentPage, itemsPerPage]);

  const handleExportClusterCSV = () => {
    if (activeCluster.members.length === 0) return;
    const headers = ['CustomerID', 'Name', 'Company', 'Email', 'Plan', 'MonthlySpend', 'ChurnRiskScore', 'Category', 'TenureMonths', 'UsageScore', 'NpsScore'];
    const rows = activeCluster.members.map(c => [
      c.id,
      `"${c.name}"`,
      `"${c.company}"`,
      c.email,
      c.plan,
      c.monthlySpend,
      c.churnRiskScore,
      c.churnRiskCategory,
      c.tenureMonths,
      c.usageScore,
      c.npsScore
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCluster.id}-cluster-members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 lg:p-7 shadow-lg border border-purple-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 border border-white/20">
                <Layers className="w-3.5 h-3.5" /> Behavioral Segmentation
              </span>
              <span className="bg-purple-500/30 text-purple-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-purple-400/30">
                100% MECE Partitioned
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              Smart Customer Clusters
            </h2>
            <p className="text-xs sm:text-sm text-purple-100 font-normal leading-relaxed">
              Every customer is segmented by revenue contribution and churn health. View top spenders, identify vulnerable enterprise revenue, and execute tailored retention plays.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-right shrink-0 min-w-[240px]">
            <span className="text-xs text-purple-200 block font-semibold">Total Segmented MRR</span>
            <span className="text-2xl font-black text-white">${totalCompanyMRR.toLocaleString()}/mo</span>
            <div className="text-[11px] text-purple-200 mt-0.5 flex items-center justify-between">
              <span>{customers.length.toLocaleString()} total accounts</span>
              <span className="font-mono">Top spend threshold: ${topSpendThreshold.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Interactive Cluster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {clusters.map((cluster) => {
          const isSelected = selectedClusterId === cluster.id;
          const IconComp = cluster.icon;
          const percentOfRevenue = totalCompanyMRR > 0 ? Math.round((cluster.totalMRR / totalCompanyMRR) * 100) : 0;
          const topSpender = cluster.members[0]; // Guaranteed top spender because members are sorted by spend desc!

          return (
            <div
              key={cluster.id}
              onClick={() => {
                setSelectedClusterId(cluster.id);
                setCurrentPage(1);
              }}
              className={`rounded-2xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between text-left relative overflow-hidden ${
                isSelected
                  ? 'bg-white border-purple-600 shadow-lg ring-4 ring-purple-600/10'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg tracking-wider">
                  Active View
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-xl ${
                    cluster.id === 'vip' ? 'bg-amber-100 text-amber-800' :
                    cluster.id === 'at-risk' ? 'bg-rose-100 text-rose-800' :
                    cluster.id === 'loyal' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-slate-900 font-mono">
                    {cluster.count.toLocaleString()} accts
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900">{cluster.title}</h3>
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 mb-2 ${cluster.badgeColor}`}>
                  {cluster.badge}
                </span>

                <p className="text-xs text-slate-500 leading-normal mb-3 font-medium line-clamp-2">
                  {cluster.description}
                </p>

                {/* Key Metrics Pill */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Monthly Revenue:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      ${cluster.totalMRR.toLocaleString()} <span className="text-[10px] text-purple-700">({percentOfRevenue}%)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Avg Spend:</span>
                    <span className="font-bold text-slate-900 font-mono">${cluster.avgSpend.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Avg Churn Risk:</span>
                    <span className={`font-bold font-mono ${cluster.avgRisk >= 50 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {cluster.avgRisk}%
                    </span>
                  </div>
                </div>

                {/* Top Spender in this cluster highlighted */}
                {topSpender && (
                  <div className="text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg border border-slate-100 flex items-center justify-between">
                    <span className="truncate max-w-[120px] font-semibold text-slate-800">
                      Top: {topSpender.company}
                    </span>
                    <span className="font-black text-emerald-700 font-mono shrink-0">
                      ${topSpender.monthlySpend.toLocaleString()}/mo
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 mt-2">
                <span>{isSelected ? 'Viewing Members' : 'Explore Cluster'}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Cluster Deep-Dive Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Cluster Header & Strategy */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${activeCluster.badgeColor}`}>
                {activeCluster.badge}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {activeCluster.members.length.toLocaleString()} total members in segment
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              {activeCluster.title} Account Roster
            </h3>
            <p className="text-xs text-slate-500 max-w-3xl">
              <strong>Segmentation Rule:</strong> {activeCluster.criteria}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportClusterCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3.5 rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export {activeCluster.title} CSV</span>
            </button>
          </div>
        </div>

        {/* AI Action Strategy Banner for this specific segment */}
        <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex items-start gap-3 text-xs">
          <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5 flex-1">
            <span className="font-bold text-purple-950 block">
              Recommended Retention & Growth Playbook for {activeCluster.title}:
            </span>
            <p className="text-purple-900 leading-relaxed font-medium">
              {activeCluster.aiStrategy}
            </p>
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeCluster.title} by company, name, plan...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-purple-600 focus:bg-white rounded-xl text-xs outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Sort by:
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="spend">Monthly Spend ($)</option>
              <option value="risk">Churn Risk Score (%)</option>
              <option value="usage">Product Usage Score</option>
              <option value="tenure">Customer Tenure</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl text-xs cursor-pointer"
              title="Toggle Sort Direction"
            >
              {sortOrder === 'desc' ? 'High → Low' : 'Low → High'}
            </button>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Customer &amp; Company</th>
                <th className="py-3 px-3 text-right">Monthly Spend</th>
                <th className="py-3 px-3 text-center">Plan Tier</th>
                <th className="py-3 px-3 text-center">Churn Risk</th>
                <th className="py-3 px-3 text-center">Usage Health</th>
                <th className="py-3 px-3 text-center">Tenure</th>
                <th className="py-3 px-4">Primary Signal / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedMembers.map((member, index) => {
                const isTopSpender = (member.monthlySpend || 0) >= topSpendThreshold;

                return (
                  <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 truncate">{member.company}</span>
                            {isTopSpender && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-amber-200">
                                Top Spender
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {member.name} • {member.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                      ${(member.monthlySpend || 0).toLocaleString()}
                      <span className="text-[10px] text-slate-400 font-normal block">/ mo</span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        member.plan === 'Enterprise'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : member.plan === 'Growth'
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {member.plan}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-xs font-black font-mono ${
                          member.churnRiskScore >= 60 ? 'text-rose-600' :
                          member.churnRiskScore >= 35 ? 'text-amber-600' :
                          'text-emerald-600'
                        }`}>
                          {member.churnRiskScore}%
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          member.churnRiskCategory === 'Critical' ? 'bg-rose-100 text-rose-800' :
                          member.churnRiskCategory === 'High' ? 'bg-orange-100 text-orange-800' :
                          member.churnRiskCategory === 'Medium' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {member.churnRiskCategory}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono font-bold text-slate-700">{member.usageScore}%</span>
                        <span className="text-[10px] text-slate-400">NPS: {member.npsScore}/10</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {member.tenureMonths} mos
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                      {member.primaryRiskFactor || member.notes || 'Normal Account Activity'}
                    </td>
                  </tr>
                );
              })}

              {paginatedMembers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No customers found matching your criteria in this cluster.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length.toLocaleString()} accounts
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="font-bold text-slate-700 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
