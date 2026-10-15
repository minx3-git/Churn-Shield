import React, { useState, useRef } from 'react';
import { Customer } from '../types';
import { Upload, FileText, CheckCircle, Download, X, AlertCircle, Sparkles, Database, Check, Layers, RefreshCw } from 'lucide-react';
import { parseCSV, convertRowsToCustomers, generateLargeBenchmarkDataset, ParseResult } from '../utils/csvParser';

interface CsvUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCustomers: (newCusts: Customer[], mode: 'replace' | 'append') => Promise<void> | void;
}

export const CsvUploadModal: React.FC<CsvUploadModalProps> = ({
  isOpen,
  onClose,
  onImportCustomers
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const sampleCsv = `CustomerID,Name,Email,Company,Plan,MonthlySpend,TenureMonths,LastLoginDaysAgo,SupportTickets,NpsScore,UsageScore,PaymentStatus,ContractType,ChurnRisk
CUST-1001,Sarah Conner,sarah@skynet.com,Cyberdyne Systems,Enterprise,4500,24,20,7,4,30,Overdue,Annual,High
CUST-1002,John Wick,john@continental.hotel,Continental Hotels,Growth,1200,12,2,1,9,88,Current,Monthly,Low
CUST-1003,Arthur Dent,arthur@hitchhiker.galaxy,Heart of Gold,Starter,490,5,15,3,6,45,Current,Monthly,Medium
CUST-1004,Bruce Wayne,bruce@wayne-enterprises.com,Wayne Enterprises,Enterprise,8200,36,1,0,10,95,Current,Annual,Low
CUST-1005,Diana Prince,diana@themyscira.gov,Themyscira Global,Growth,1650,18,28,8,3,25,Failed,Monthly,Critical`;

    const blob = new Blob([sampleCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'churnshield_sample_customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const processFileContent = (text: string, name: string, size: number) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setFileName(name);
    
    const sizeInKb = (size / 1024).toFixed(1);
    const sizeStr = size > 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(2)} MB` : `${sizeInKb} KB`;
    setFileSizeStr(sizeStr);

    // Defer parsing slightly so UI shows processing state
    setTimeout(() => {
      try {
        const rows = parseCSV(text);
        if (rows.length < 2) {
          setErrorMessage('The selected file contains fewer than 2 rows (header + data). Please verify your CSV export.');
          setIsProcessing(false);
          return;
        }

        const result = convertRowsToCustomers(rows);
        if (result.customers.length === 0) {
          setErrorMessage('Could not extract valid customer records from the file. Please check file format.');
          setIsProcessing(false);
          return;
        }

        setParseResult(result);
        setIsProcessing(false);
      } catch (err: any) {
        setErrorMessage(`Error parsing CSV file: ${err?.message || 'Invalid format'}`);
        setIsProcessing(false);
      }
    }, 50);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processFileContent(text, file.name, file.size);
      };
      reader.readAsText(file);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
        setErrorMessage('Please drop a valid .csv file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processFileContent(text, file.name, file.size);
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.customers.length === 0) return;

    setIsProcessing(true);
    try {
      await onImportCustomers(parseResult.customers, importMode);
      setSuccessMessage(`Successfully imported ${parseResult.customers.length.toLocaleString()} customer accounts into active dataset!`);
      setTimeout(() => {
        setSuccessMessage(null);
        setParseResult(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(`Failed to apply dataset: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadBenchmark10k = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(async () => {
      try {
        const benchmark10k = generateLargeBenchmarkDataset(10000);
        await onImportCustomers(benchmark10k, 'replace');
        setSuccessMessage('Successfully generated and loaded 10,000 enterprise customer records into active intelligence engine!');
        setTimeout(() => {
          setSuccessMessage(null);
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMessage(`Failed to load benchmark dataset: ${err?.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, 80);
  };

  const handleResetModal = () => {
    setParseResult(null);
    setFileName('');
    setFileSizeStr('');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3.5 border-b border-slate-100 pb-4">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-purple-200">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-900">Import Customer Dataset (CSV)</h3>
            <p className="text-xs text-slate-500 font-medium">
              Upload any customer dataset (10,000+ rows supported) for instant ML churn analysis
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-rose-800 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 bg-purple-50/50 rounded-2xl border border-purple-100">
            <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-purple-900">Processing & Scoring Dataset...</p>
            <p className="text-xs text-purple-600">Calculating predictive risk scores & auto-mapping columns</p>
          </div>
        )}

        {!isProcessing && !parseResult && (
          <div className="space-y-4">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
                dragActive
                  ? 'border-purple-600 bg-purple-50 scale-[1.01]'
                  : 'border-slate-200 hover:border-purple-300 bg-slate-50/70 hover:bg-slate-50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="w-10 h-10 text-purple-500 mx-auto mb-2.5 opacity-80" />
              <p className="text-sm text-slate-800 font-bold">Drag & drop your CSV file here</p>
              <p className="text-xs text-slate-500 mt-1">or click anywhere to browse from your computer</p>

              <div className="mt-4 inline-flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-200">
                <Upload className="w-3.5 h-3.5" />
                <span>Select CSV File</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-file-input"
              />

              <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Kaggle Bank Churn (10,000)</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">Telco Churn</span>
                <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200">SaaS & CRM Exports</span>
              </div>
            </div>

            {/* Quick 1-Click 10,000 Benchmark Loader */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <Database className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-bold text-purple-900">Want to test with 10,000 records immediately?</span>
                </div>
                <p className="text-[11px] text-purple-700">Load the full 10,000-customer enterprise benchmark dataset in 1 click.</p>
              </div>
              <button
                type="button"
                onClick={handleLoadBenchmark10k}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shrink-0 transition-all shadow-sm cursor-pointer"
              >
                Load 10,000 Dataset
              </button>
            </div>

            {/* Sample CSV Download Footer */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Need a reference CSV format?</span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="text-purple-700 hover:text-purple-800 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* Parsed Preview & Confirmation View */}
        {!isProcessing && parseResult && (
          <div className="space-y-4">
            {/* File Info Card */}
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                  CSV
                </div>
                <div>
                  <h4 className="text-sm font-bold text-purple-950">{fileName || 'Uploaded Dataset'}</h4>
                  <p className="text-xs text-purple-700 font-medium">
                    {parseResult.importedCount.toLocaleString()} customer records parsed • {fileSizeStr}
                  </p>
                </div>
              </div>
              <button
                onClick={handleResetModal}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 px-2 py-1 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
              >
                Change File
              </button>
            </div>

            {/* Column Detection Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                Auto-Detected & Mapped Columns ({Object.keys(parseResult.matchedFields).length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(parseResult.matchedFields).map(([standardName, originalCol]) => (
                  <span
                    key={standardName}
                    className="bg-white text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] font-medium"
                  >
                    <strong className="text-purple-700">{standardName}:</strong> {originalCol}
                  </span>
                ))}
              </div>
            </div>

            {/* Preview of first 3 rows */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-700 text-xs block">
                Sample Record Preview (First 3 of {parseResult.importedCount.toLocaleString()}):
              </span>
              <div className="border border-slate-200 rounded-xl overflow-x-auto text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-[9px]">
                    <tr>
                      <th className="py-1.5 px-2.5">Customer / Company</th>
                      <th className="py-1.5 px-2.5">Spend</th>
                      <th className="py-1.5 px-2.5">Plan</th>
                      <th className="py-1.5 px-2.5">Tenure</th>
                      <th className="py-1.5 px-2.5">ML Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parseResult.customers.slice(0, 3).map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-medium text-slate-900">
                          <div>{c.company}</div>
                          <div className="text-[10px] text-slate-500">{c.name}</div>
                        </td>
                        <td className="py-2 px-2.5 font-bold text-slate-800">${c.monthlySpend}/mo</td>
                        <td className="py-2 px-2.5 text-slate-600">{c.plan}</td>
                        <td className="py-2 px-2.5 text-slate-600">{c.tenureMonths} mos</td>
                        <td className="py-2 px-2.5 font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              c.churnRiskScore >= 60
                                ? 'bg-rose-100 text-rose-700'
                                : c.churnRiskScore >= 35
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {c.churnRiskScore}% ({c.churnRiskCategory})
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Mode Radio */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Dataset Application Mode:</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label
                  className={`border rounded-xl p-2.5 cursor-pointer flex items-start space-x-2 transition-all ${
                    importMode === 'replace'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="block font-bold">Replace Current Dataset</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Set these {parseResult.importedCount.toLocaleString()} records as the primary active dataset
                    </span>
                  </div>
                </label>

                <label
                  className={`border rounded-xl p-2.5 cursor-pointer flex items-start space-x-2 transition-all ${
                    importMode === 'append'
                      ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="block font-bold">Append to Existing</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Combine with existing accounts
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-purple-200 flex items-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Import {parseResult.importedCount.toLocaleString()} Customers</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
