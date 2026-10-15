import React, { useState } from 'react';
import { Customer } from '../types';
import { AlertTriangle, Upload, Search, Filter, Sparkles, X, Check, Copy, UserCheck, ShieldAlert, ArrowRight, UserPlus, CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface ChurnPredictionViewProps {
  customers: Customer[];
  onOpenCsvModal: () => void;
  onOpenAddModal: () => void;
}

export const ChurnPredictionView: React.FC<ChurnPredictionViewProps> = ({
  customers,
  onOpenCsvModal,
  onOpenAddModal
}) => {
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [riskFilter, setRiskFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiStrategy, setAiStrategy] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Single Customer Predictor Form State
  const [testDaysInactive, setTestDaysInactive] = useState(18);
  const [testTickets, setTestTickets] = useState(4);
  const [testMonthlySpend, setTestMonthlySpend] = useState(450);
  const [testPrediction, setTestPrediction] = useState<{ score: number; risk: string; recommendation: string } | null>(null);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (riskFilter === 'High') return c.churnRiskScore >= 60;
    if (riskFilter === 'Medium') return c.churnRiskScore >= 35 && c.churnRiskScore < 60;
    if (riskFilter === 'Low') return c.churnRiskScore < 35;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCustomers = filteredCustomers.slice((validCurrentPage - 1) * pageSize, validCurrentPage * pageSize);

  const handleFilterChange = (val: 'All' | 'High' | 'Medium' | 'Low') => {
    setRiskFilter(val);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleFetchAiStrategy = async (cust: Customer) => {
    setLoadingAi(true);
    setAiStrategy(null);
    try {
      const res = await fetch('/api/ai/customer-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: cust.id,
          customer: cust
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }

      const data = await res.json();
      if (data && data.aiAnalysis) {
        setAiStrategy(data);
      } else {
        throw new Error('Invalid response payload');
      }
    } catch (err) {
      console.warn('Using client-grounded AI strategy fallback for customer:', cust.name, err);
      setAiStrategy({
        aiAnalysis: `${cust.name} from ${cust.company} (${cust.plan} Plan, $${(cust.monthlySpend || 0).toLocaleString()}/mo) has a Churn Risk Score of ${cust.churnRiskScore}%. Primary churn driver is '${cust.primaryRiskFactor || 'Recent decline in product logins & open support tickets'}'. Account has been inactive for ${cust.lastLoginDaysAgo} days with ${cust.supportTickets} support tickets.`,
        recommendedIncentive: cust.plan === 'Enterprise' ? 'Executive Sponsor Review & 20% annual contract renewal credit' : '1-on-1 technical walkthrough & 15% billing credit',
        winBackEmail: {
          subject: `Dedicated Partner Review & Support for ${cust.company}`,
          body: `Hi ${cust.name},\n\nI hope you're having a productive week! I wanted to personally reach out regarding ${cust.company}'s account.\n\nWe noticed your team has ${cust.supportTickets} support queries and hasn't logged in over the past ${cust.lastLoginDaysAgo} days. We value your business and want to make sure your team gets maximum value from your ${cust.plan} subscription.\n\nCould we schedule a quick 10-minute check-in call? We'd also be happy to apply a 15% courtesy discount on your next billing cycle.\n\nWarmly,\nCustomer Success Team`
        }
      });
    } finally {
      setLoadingAi(false);
    }
  };

  const handleTestPrediction = () => {
    const score = Math.min(98, Math.max(5, Math.round(testDaysInactive * 2.8 + testTickets * 8 + (5000 - testMonthlySpend) * 0.005)));
    let risk = 'Low Risk 🟢';
    let recommendation = 'Account is healthy! Continue standard monthly newsletter check-ins.';

    if (score >= 60) {
      risk = 'High Risk 🔴';
      recommendation = 'Contact owner within 48 hours. Offer 15% renewal discount & 1-on-1 support call.';
    } else if (score >= 35) {
      risk = 'Medium Risk 🟡';
      recommendation = 'Send automated re-engagement product feature guide & invite to live Q&A.';
    }

    setTestPrediction({ score, risk, recommendation });
  };

  return (
    <div className="space-y-6">
      {/* Upload Option & Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              AI Risk Engine
            </span>
          </div>
          <h2 className="text-2xl font-black text-white">Churn Prediction & Customer Risk</h2>
          <p className="text-xs text-purple-100 max-w-xl font-medium leading-relaxed">
            Easily see which customers are likely to leave, import your customer lists from CSV, and get instant step-by-step AI recommendations to save them.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={onOpenCsvModal}
            className="bg-white text-purple-700 hover:bg-purple-50 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-purple-600" />
            <span>Upload CSV Dataset</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="bg-purple-900/60 hover:bg-purple-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl border border-white/20 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Single Customer</span>
          </button>
        </div>
      </div>

      {/* Grid: Quick Test Predictor + Customer Risk Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Test Risk Tool */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Quick Churn Risk Tester
            </h3>
            <p className="text-xs text-slate-500">Test risk for a hypothetical customer profile</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Days Inactive (No login/visit)</label>
              <input
                type="number"
                value={testDaysInactive}
                onChange={(e) => setTestDaysInactive(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Support Requests / Complaints</label>
              <input
                type="number"
                value={testTickets}
                onChange={(e) => setTestTickets(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Monthly Spend ($)</label>
              <input
                type="number"
                value={testMonthlySpend}
                onChange={(e) => setTestMonthlySpend(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={handleTestPrediction}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition-all text-xs cursor-pointer shadow-xs"
            >
              Calculate Churn Risk
            </button>
          </div>

          {testPrediction && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between items-center font-bold">
                <span className="text-slate-800">Calculated Risk Score:</span>
                <span className="text-purple-800 text-sm">{testPrediction.score}% ({testPrediction.risk})</span>
              </div>
              <div className="text-slate-600 font-medium leading-snug pt-1 border-t border-purple-200">
                <strong>Recommended Action:</strong> {testPrediction.recommendation}
              </div>
            </div>
          )}
        </div>

        {/* Main Customer List with Risk Categories */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
                Customer Risk Directory
              </h3>
              <p className="text-xs text-slate-500">
                {filteredCustomers.length.toLocaleString()} {filteredCustomers.length === 1 ? 'account' : 'accounts'} loaded
              </p>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter directory..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <select
                value={riskFilter}
                onChange={(e) => handleFilterChange(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                <option value="All">All Tiers ({customers.length})</option>
                <option value="High">🔴 High Risk (≥60%)</option>
                <option value="Medium">🟡 Medium (35-59%)</option>
                <option value="Low">🟢 Low Risk (&lt;35%)</option>
              </select>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
                <option value="250">250 / page</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-400 tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Customer Account</th>
                  <th className="py-2.5 px-3">Monthly Spend</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3">Primary Factor</th>
                  <th className="py-2.5 px-3 text-right">AI Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <img src={cust.avatar} alt={cust.name} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                          <div>
                            <span className="font-bold text-slate-900 block">{cust.company}</span>
                            <span className="text-[11px] text-slate-500">{cust.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-bold text-slate-800 font-mono">
                        ${cust.monthlySpend.toLocaleString()}/mo
                      </td>

                      <td className="py-3 px-3">
                        <span className={`font-bold px-2.5 py-1 rounded-md text-[11px] border inline-block ${
                          cust.churnRiskScore >= 60
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : cust.churnRiskScore >= 35
                            ? 'bg-amber-50 text-amber-600 border-amber-200'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {cust.churnRiskScore}% Risk
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-medium max-w-[180px] truncate" title={cust.primaryRiskFactor}>
                        {cust.primaryRiskFactor}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedCust(cust);
                            handleFetchAiStrategy(cust);
                          }}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer"
                        >
                          AI Recommendations
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No customer accounts matching "{searchQuery}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {filteredCustomers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
              <div>
                Showing <strong className="text-slate-900 font-bold">{((validCurrentPage - 1) * pageSize) + 1}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{Math.min(validCurrentPage * pageSize, filteredCustomers.length).toLocaleString()}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{filteredCustomers.length.toLocaleString()}</strong> accounts
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={validCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold rounded-lg border border-purple-200">
                  Page {validCurrentPage.toLocaleString()} of {totalPages.toLocaleString()}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={validCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={validCurrentPage >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Recommendation Modal for Selected Customer */}
      {selectedCust && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedCust(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <img src={selectedCust.avatar} alt={selectedCust.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-600" />
              <div>
                <h3 className="font-bold text-lg text-slate-900">{selectedCust.company}</h3>
                <p className="text-xs text-slate-500">{selectedCust.name} • {selectedCust.email} • ${selectedCust.monthlySpend}/mo</p>
              </div>
            </div>

            {loadingAi ? (
              <div className="py-8 text-center text-xs text-purple-700 font-bold space-y-2">
                <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p>Generating step-by-step AI recommendation...</p>
              </div>
            ) : aiStrategy ? (
              <div className="space-y-4 text-xs">
                <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 text-purple-900 leading-relaxed font-medium">
                  <strong className="text-purple-700 block mb-1">AI Risk Breakdown:</strong>
                  {aiStrategy.aiAnalysis}
                </div>

                {aiStrategy.recommendedIncentive && (
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 text-emerald-800 font-bold">
                    🎁 Recommended Retention Offer: {aiStrategy.recommendedIncentive}
                  </div>
                )}

                {aiStrategy.winBackEmail && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 font-bold text-slate-800">
                      <span>Ready Email Copy for Small Business Owner</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(aiStrategy.winBackEmail.body);
                          setCopiedEmail(true);
                          setTimeout(() => setCopiedEmail(false), 2000);
                        }}
                        className="text-purple-700 hover:text-purple-800 flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEmail ? 'Copied!' : 'Copy Body'}</span>
                      </button>
                    </div>
                    <p className="font-bold text-slate-800">Subject: {aiStrategy.winBackEmail.subject}</p>
                    <pre className="whitespace-pre-wrap font-sans text-slate-600 text-xs bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                      {aiStrategy.winBackEmail.body}
                    </pre>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
