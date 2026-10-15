import React from 'react';
import { ShieldAlert, Upload, Plus, Sparkles, Database, Search } from 'lucide-react';

interface HeaderProps {
  onOpenCsvUpload: () => void;
  onOpenAddCustomer: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  datasetPreset: string;
  setDatasetPreset: (preset: string) => void;
  customerCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCsvUpload,
  onOpenAddCustomer,
  searchQuery,
  setSearchQuery,
  datasetPreset,
  setDatasetPreset,
  customerCount
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 lg:px-6 py-3 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200 text-white">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-indigo-600">
                ChurnShield
              </span>
              <span className="bg-purple-50 text-purple-700 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" /> AI Platform
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Customer Intelligence & ML Retention Engine</p>
          </div>
        </div>

        {/* Search & Dataset Switcher */}
        <div className="flex items-center space-x-2 flex-1 max-w-md mx-0 md:mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search intelligence, customers, companies..."
              className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600">
            <Database className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline font-medium">Dataset:</span>
            <select
              value={datasetPreset}
              onChange={(e) => setDatasetPreset(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="B2B SaaS" className="bg-white text-slate-800">B2B SaaS Default (8 Accounts)</option>
              <option value="10,000 Benchmark" className="bg-white text-slate-800">10,000 Enterprise Benchmark</option>
              {customerCount > 8 && datasetPreset !== '10,000 Benchmark' && (
                <option value="Custom Upload" className="bg-white text-slate-800">
                  Custom Upload ({customerCount.toLocaleString()} Accounts)
                </option>
              )}
              <option value="E-Commerce" className="bg-white text-slate-800">E-Commerce Subscriptions</option>
              <option value="FinTech" className="bg-white text-slate-800">FinTech Accounts</option>
            </select>
          </div>

          <button
            onClick={onOpenCsvUpload}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-md shadow-purple-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>
    </header>
  );
};
