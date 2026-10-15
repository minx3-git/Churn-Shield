import React, { useState, useEffect } from 'react';
import { Customer } from './types';
import { INITIAL_CUSTOMERS } from './data/mockData';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AIChatView } from './components/AIChatView';
import { BudgetTwinView } from './components/BudgetTwinView';
import { ChurnPredictionView } from './components/ChurnPredictionView';
import { CustomerClustersView } from './components/CustomerClustersView';
import { CsvUploadModal } from './components/CsvUploadModal';
import { NewCustomerModal } from './components/NewCustomerModal';
import { generateLargeBenchmarkDataset } from './utils/csvParser';

export default function App() {
  const [datasetPreset, setDatasetPreset] = useState<string>(() => {
    try {
      const cachedPreset = localStorage.getItem('churnshield_dataset_preset');
      if (cachedPreset) return cachedPreset;
    } catch {}
    return '10,000 Benchmark';
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const cachedPreset = localStorage.getItem('churnshield_dataset_preset') || '10,000 Benchmark';
      if (cachedPreset === '10,000 Benchmark') {
        return generateLargeBenchmarkDataset(10000);
      }
      const cached = localStorage.getItem('churnshield_saved_customers');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read cached dataset from localStorage:', e);
    }
    return generateLargeBenchmarkDataset(10000);
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Sync with backend on initial mount
  useEffect(() => {
    const syncBackend = async () => {
      try {
        const currentPreset = localStorage.getItem('churnshield_dataset_preset') || '10,000 Benchmark';
        if (currentPreset === '10,000 Benchmark') {
          const benchmark10k = generateLargeBenchmarkDataset(10000);
          setCustomers(benchmark10k);
          await fetch('/api/customers/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customers: benchmark10k, mode: 'replace' })
          });
          return;
        }

        const cached = localStorage.getItem('churnshield_saved_customers');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomers(parsed);
            await fetch('/api/customers/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customers: parsed, mode: 'replace' })
            });
            return;
          }
        }

        // If specific small preset like B2B SaaS or FinTech, fetch from backend
        const res = await fetch('/api/customers');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.customers) && data.customers.length > 0) {
            setCustomers(data.customers);
          }
        }
      } catch (err) {
        console.log('Using local dataset fallback:', err);
      }
    };

    syncBackend();
  }, []);

  // Preset Dataset Handler
  const handlePresetChange = async (preset: string) => {
    setDatasetPreset(preset);
    try {
      localStorage.setItem('churnshield_dataset_preset', preset);
    } catch {}

    if (preset === '10,000 Benchmark') {
      const benchmark10k = generateLargeBenchmarkDataset(10000);
      setCustomers(benchmark10k);
      try {
        localStorage.setItem('churnshield_saved_customers', JSON.stringify(benchmark10k));
      } catch (e) {
        console.warn('LocalStorage limit reached for full 10k cache, relying on server state:', e);
      }
      try {
        await fetch('/api/customers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers: benchmark10k, mode: 'replace' })
        });
      } catch (err) {
        console.error('Failed to sync benchmark to backend:', err);
      }
    } else if (preset === 'Custom Upload') {
      try {
        const cached = localStorage.getItem('churnshield_saved_customers');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomers(parsed);
            await fetch('/api/customers/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customers: parsed, mode: 'replace' })
            });
            return;
          }
        }
      } catch {}
    } else if (preset === 'E-Commerce') {
      const ecom: Customer[] = [
        {
          id: 'ECOM-2001',
          name: 'Jessica Alba',
          email: 'j.alba@fashionbox.com',
          company: 'FashionBox Club',
          avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
          plan: 'Growth',
          monthlySpend: 290,
          tenureMonths: 8,
          lastLoginDaysAgo: 22,
          supportTickets: 4,
          npsScore: 4,
          usageScore: 30,
          featureAdoptionScore: 25,
          paymentStatus: 'Overdue',
          contractType: 'Monthly',
          churnRiskScore: 88,
          churnRiskCategory: 'Critical',
          primaryRiskFactor: 'Skipped 2 consecutive subscription boxes & Overdue Payment',
          segment: 'At-Risk',
          joinDate: '2024-06-12'
        },
        {
          id: 'ECOM-2002',
          name: 'Liam Neeson',
          email: 'liam@gourmetcoffee.co',
          company: 'Gourmet Coffee Roasters',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
          plan: 'Enterprise',
          monthlySpend: 1800,
          tenureMonths: 24,
          lastLoginDaysAgo: 1,
          supportTickets: 0,
          npsScore: 10,
          usageScore: 95,
          featureAdoptionScore: 92,
          paymentStatus: 'Current',
          contractType: 'Annual',
          churnRiskScore: 6,
          churnRiskCategory: 'Low',
          primaryRiskFactor: 'Healthy Recurring Orders',
          segment: 'Champions',
          joinDate: '2023-01-15'
        }
      ];
      setCustomers(ecom);
      try {
        await fetch('/api/customers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers: ecom, mode: 'replace' })
        });
      } catch {}
    } else if (preset === 'FinTech') {
      const fintech: Customer[] = [
        {
          id: 'FIN-3001',
          name: 'Alexander Wright',
          email: 'awright@capitalfund.io',
          company: 'Capital Fund Advisors',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
          plan: 'Enterprise',
          monthlySpend: 9500,
          tenureMonths: 19,
          lastLoginDaysAgo: 28,
          supportTickets: 6,
          npsScore: 2,
          usageScore: 18,
          featureAdoptionScore: 22,
          paymentStatus: 'Failed',
          contractType: 'Annual',
          churnRiskScore: 96,
          churnRiskCategory: 'Critical',
          primaryRiskFactor: 'Failed API Reconciliation & Zero Login in 28 Days',
          segment: 'At-Risk',
          joinDate: '2023-07-20'
        }
      ];
      setCustomers(fintech);
      try {
        await fetch('/api/customers/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers: fintech, mode: 'replace' })
        });
      } catch {}
    } else {
      // Default: B2B SaaS (8 initial accounts)
      setCustomers(INITIAL_CUSTOMERS);
      try {
        localStorage.removeItem('churnshield_saved_customers');
        await fetch('/api/customers/reset', { method: 'POST' });
      } catch {}
    }
  };

  // Add single customer handler
  const handleAddCustomer = async (custData: Partial<Customer>) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(custData)
      });
      const data = await res.json();
      if (data.customer) {
        const updated = [data.customer, ...customers];
        setCustomers(updated);
        try {
          localStorage.setItem('churnshield_saved_customers', JSON.stringify(updated));
        } catch {}
      }
    } catch (err) {
      console.error('Failed to add customer:', err);
    }
  };

  // Import CSV customers handler
  const handleImportCustomers = async (importedCusts: Customer[], mode: 'replace' | 'append') => {
    const updated = mode === 'replace' ? importedCusts : [...importedCusts, ...customers];
    setCustomers(updated);

    const newPreset = updated.length >= 10000 ? '10,000 Benchmark' : 'Custom Upload';
    setDatasetPreset(newPreset);

    // Save to localStorage for browser persistence across reloads
    try {
      localStorage.setItem('churnshield_dataset_preset', newPreset);
      localStorage.setItem('churnshield_saved_customers', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage quota limit reached, relying on backend synchronization:', e);
    }

    // Sync full dataset with Express backend server
    try {
      await fetch('/api/customers/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: updated, mode: 'replace' })
      });
    } catch (err) {
      console.error('Failed to sync bulk imported customers with backend:', err);
    }
  };

  const highRiskCount = customers.filter(c => c.churnRiskScore >= 60).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-purple-600 selection:text-white">
      {/* Top Navigation Bar */}
      <Header
        onOpenCsvUpload={() => setIsCsvModalOpen(true)}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        datasetPreset={datasetPreset}
        setDatasetPreset={handlePresetChange}
        customerCount={customers.length}
      />

      {/* Main App Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1700px] w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          highRiskCount={highRiskCount}
          totalCustomersCount={customers.length}
        />

        {/* Tab Content Panel */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              customers={customers}
              onSelectCustomer={(cust) => {
                setSelectedCustomer(cust);
                setActiveTab('churn-prediction');
              }}
              onNavigateToPlaybooks={() => setActiveTab('churn-prediction')}
            />
          )}

          {activeTab === 'ai-chat' && (
            <AIChatView customers={customers} />
          )}

          {activeTab === 'budget-twin' && (
            <BudgetTwinView customers={customers} />
          )}

          {activeTab === 'churn-prediction' && (
            <ChurnPredictionView
              customers={customers}
              onOpenCsvModal={() => setIsCsvModalOpen(true)}
              onOpenAddModal={() => setIsAddCustomerOpen(true)}
            />
          )}

          {activeTab === 'customer-clusters' && (
            <CustomerClustersView customers={customers} />
          )}
        </main>
      </div>

      {/* CSV Upload Modal */}
      <CsvUploadModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportCustomers={handleImportCustomers}
      />

      {/* Add New Customer Modal */}
      <NewCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onAddCustomer={handleAddCustomer}
      />
    </div>
  );
}
