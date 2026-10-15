import React, { useState } from 'react';
import { Customer } from '../types';
import { UserPlus, X } from 'lucide-react';

interface NewCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (customerData: Partial<Customer>) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomer
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [plan, setPlan] = useState<'Starter' | 'Growth' | 'Enterprise'>('Growth');
  const [monthlySpend, setMonthlySpend] = useState(1250);
  const [supportTickets, setSupportTickets] = useState(2);
  const [lastLoginDaysAgo, setLastLoginDaysAgo] = useState(3);
  const [npsScore, setNpsScore] = useState(8);
  const [usageScore, setUsageScore] = useState(70);
  const [paymentStatus, setPaymentStatus] = useState<'Current' | 'Overdue' | 'Failed'>('Current');
  const [contractType, setContractType] = useState<'Monthly' | 'Annual'>('Monthly');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer({
      name: name || 'New Client Contact',
      email: email || 'contact@client.com',
      company: company || 'Enterprise Client Inc',
      plan,
      monthlySpend: Number(monthlySpend) || 990,
      supportTickets: Number(supportTickets) || 0,
      lastLoginDaysAgo: Number(lastLoginDaysAgo) || 0,
      npsScore: Number(npsScore) || 7,
      usageScore: Number(usageScore) || 50,
      paymentStatus,
      contractType
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-xs">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-900">Add New Account</h3>
            <p className="text-xs text-slate-500">Register a new subscription profile for ML monitoring</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Company Name</label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Contact Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@acme.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Plan Tier</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="Starter">Starter</option>
                <option value="Growth">Growth</option>
                <option value="Enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Monthly Spend ($)</label>
              <input
                type="number"
                value={monthlySpend}
                onChange={(e) => setMonthlySpend(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Days Inactive</label>
              <input
                type="number"
                value={lastLoginDaysAgo}
                onChange={(e) => setLastLoginDaysAgo(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Support Tickets</label>
              <input
                type="number"
                value={supportTickets}
                onChange={(e) => setSupportTickets(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="Current">Current</option>
                <option value="Overdue">Overdue</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">Contract Type</label>
              <select
                value={contractType}
                onChange={(e) => setContractType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl cursor-pointer transition-colors shadow-xs"
          >
            Create Account & Score Churn Risk
          </button>
        </form>
      </div>
    </div>
  );
};
