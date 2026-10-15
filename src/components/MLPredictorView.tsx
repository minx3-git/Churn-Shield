import React, { useState, useEffect } from 'react';
import { MLModelMetrics, ChurnPredictionResult } from '../types';
import {
  BrainCircuit,
  Sliders,
  Play,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Layers,
  BarChart3,
  Activity,
  Award
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface MLPredictorViewProps {
  initialMetrics: MLModelMetrics;
}

export const MLPredictorView: React.FC<MLPredictorViewProps> = ({ initialMetrics }) => {
  // Simulator State
  const [lastLoginDaysAgo, setLastLoginDaysAgo] = useState(18);
  const [supportTickets, setSupportTickets] = useState(6);
  const [usageScore, setUsageScore] = useState(32);
  const [npsScore, setNpsScore] = useState(3);
  const [tenureMonths, setTenureMonths] = useState(10);
  const [monthlySpend, setMonthlySpend] = useState(2400);
  const [contractType, setContractType] = useState<'Monthly' | 'Annual'>('Monthly');
  const [paymentStatus, setPaymentStatus] = useState<'Current' | 'Overdue' | 'Failed'>('Overdue');

  const [prediction, setPrediction] = useState<ChurnPredictionResult | null>(null);
  const [predicting, setPredicting] = useState(false);

  // Model Retraining State
  const [metrics, setMetrics] = useState<MLModelMetrics>(initialMetrics);
  const [algorithm, setAlgorithm] = useState<'Random Forest Classifier' | 'Gradient Boosting' | 'Logistic Regression'>('Random Forest Classifier');
  const [nEstimators, setNEstimators] = useState(150);
  const [maxDepth, setMaxDepth] = useState(12);
  const [learningRate, setLearningRate] = useState(0.05);
  const [retraining, setRetraining] = useState(false);

  // Calculate prediction live
  const calculatePrediction = async () => {
    setPredicting(true);
    try {
      const res = await fetch('/api/predict-churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastLoginDaysAgo,
          supportTickets,
          usageScore,
          npsScore,
          tenureMonths,
          monthlySpend,
          contractType,
          paymentStatus
        })
      });
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error('Failed to run churn prediction:', err);
    } finally {
      setPredicting(false);
    }
  };

  useEffect(() => {
    calculatePrediction();
  }, [lastLoginDaysAgo, supportTickets, usageScore, npsScore, tenureMonths, monthlySpend, contractType, paymentStatus]);

  // Handle Model Retraining
  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const res = await fetch('/api/ml-retrain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          algorithm,
          nEstimators,
          maxDepth,
          learningRate
        })
      });
      const data = await res.json();
      if (data.metrics) {
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Failed to retrain ML model:', err);
    } finally {
      setRetraining(false);
    }
  };

  // ROC Curve Data
  const rocData = {
    labels: metrics.rocCurveData.map(d => d.fpr.toFixed(2)),
    datasets: [
      {
        label: `ROC Curve (AUC = ${metrics.rocAuc})`,
        data: metrics.rocCurveData.map(d => d.tpr),
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Random Baseline (AUC = 0.5)',
        data: [0, 0.2, 0.4, 0.6, 0.8, 1.0],
        borderColor: '#94a3b8',
        borderDash: [5, 5],
        fill: false
      }
    ]
  };

  // Feature Importance Data
  const featureData = {
    labels: metrics.featureImportances.map(f => f.label),
    datasets: [
      {
        label: 'Weight Importance',
        data: metrics.featureImportances.map(f => f.weight),
        backgroundColor: '#7c3aed',
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: LIVE CHURN RISK SIMULATOR */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-md shadow-purple-200">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Single Customer Churn Simulator</h2>
              <p className="text-xs text-slate-500">Adjust behavioral features to simulate real-time ML churn risk probability & SHAP risk drivers</p>
            </div>
          </div>
          <button
            onClick={() => {
              setLastLoginDaysAgo(3);
              setSupportTickets(1);
              setUsageScore(85);
              setNpsScore(9);
              setTenureMonths(18);
              setMonthlySpend(1500);
              setContractType('Annual');
              setPaymentStatus('Current');
            }}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset to Healthy Benchmark</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Feature Inputs Sliders */}
          <div className="lg:col-span-7 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" /> Behavioral & Financial Feature Sliders
            </h3>

            {/* Slider 1 */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 font-medium">Days Inactive (Last Login)</span>
                <span className="text-purple-700 font-bold">{lastLoginDaysAgo} Days</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={lastLoginDaysAgo}
                onChange={(e) => setLastLoginDaysAgo(Number(e.target.value))}
                className="w-full accent-purple-600 bg-slate-100 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Slider 2 */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 font-medium">Support Tickets (Last 30 Days)</span>
                <span className="text-purple-700 font-bold">{supportTickets} Tickets</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                value={supportTickets}
                onChange={(e) => setSupportTickets(Number(e.target.value))}
                className="w-full accent-purple-600 bg-slate-100 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Slider 3 */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 font-medium">Product Usage Score</span>
                <span className="text-purple-700 font-bold">{usageScore}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={usageScore}
                onChange={(e) => setUsageScore(Number(e.target.value))}
                className="w-full accent-purple-600 bg-slate-100 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Slider 4 */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-700 font-medium">NPS Satisfaction Rating</span>
                <span className="text-purple-700 font-bold">{npsScore}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={npsScore}
                onChange={(e) => setNpsScore(Number(e.target.value))}
                className="w-full accent-purple-600 bg-slate-100 rounded-lg cursor-pointer h-2"
              />
            </div>

            {/* Categoricals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Contract Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setContractType('Monthly')}
                    className={`py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                      contractType === 'Monthly'
                        ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setContractType('Annual')}
                    className={`py-1.5 text-xs font-bold rounded-xl border cursor-pointer transition-colors ${
                      contractType === 'Annual'
                        ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Annual
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                >
                  <option value="Current">Current (Paid)</option>
                  <option value="Overdue">Overdue (Notice Sent)</option>
                  <option value="Failed">Failed (Declined)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Prediction Gauge & Output Panel */}
          <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
            {prediction ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Predicted Risk Output</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      prediction.churnRiskCategory === 'Critical'
                        ? 'bg-rose-50 text-rose-600 border-rose-200'
                        : prediction.churnRiskCategory === 'High'
                        ? 'bg-orange-50 text-orange-600 border-orange-200'
                        : prediction.churnRiskCategory === 'Medium'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    }`}
                  >
                    {prediction.churnRiskCategory} Risk
                  </span>
                </div>

                {/* Meter Gauge */}
                <div className="text-center py-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-5xl font-black text-slate-900 tracking-tight">
                    {prediction.churnRiskScore}<span className="text-2xl font-normal text-slate-400">%</span>
                  </span>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Probability of Account Churn</p>

                  <div className="w-4/5 mx-auto bg-slate-100 rounded-full h-3 mt-3 overflow-hidden p-0.5 border border-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        prediction.churnRiskScore >= 75
                          ? 'bg-rose-500'
                          : prediction.churnRiskScore >= 60
                          ? 'bg-orange-500'
                          : prediction.churnRiskScore >= 35
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${prediction.churnRiskScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Primary Factor */}
                <div className="bg-white p-3 rounded-xl border border-rose-200">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Primary Churn Driver</span>
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                    {prediction.primaryRiskFactor}
                  </p>
                </div>

                {/* SHAP Feature Contribution */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">SHAP Feature Impact Breakdown</span>
                  <div className="space-y-2">
                    {prediction.featureContributions.map((fc, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 text-[11px] font-medium">{fc.label}</span>
                        <div className="flex items-center space-x-2 w-1/2">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-purple-600 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, fc.impact * 2.5)}%` }}
                            ></div>
                          </div>
                          <span className="text-slate-700 font-mono text-[10px] w-8 text-right font-bold">+{fc.impact}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">Calculating prediction...</div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: ML MODEL RETRAINING & ANALYTICS LAB */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Machine Learning Model Retraining Lab</h2>
                <span className="bg-emerald-50 text-emerald-700 text-xs px-2.5 py-0.5 rounded-md font-bold border border-emerald-200">
                  Scikit-Learn Python Engine
                </span>
              </div>
              <p className="text-xs text-slate-500">Tune model hyperparameters, adjust classifiers, and evaluate ROC-AUC & Confusion Matrix</p>
            </div>
          </div>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md shadow-purple-200 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Training Model...' : 'Retrain & Evaluate Model'}</span>
          </button>
        </div>

        {/* Hyperparameter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Algorithm Classifier</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 font-medium focus:outline-none"
            >
              <option value="Random Forest Classifier">Random Forest Classifier</option>
              <option value="Gradient Boosting">Gradient Boosting (XGBoost)</option>
              <option value="Logistic Regression">Logistic Regression</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>N Estimators (Trees)</span>
              <span className="text-purple-700 font-bold">{nEstimators}</span>
            </div>
            <input
              type="range"
              min="50"
              max="300"
              step="10"
              value={nEstimators}
              onChange={(e) => setNEstimators(Number(e.target.value))}
              className="w-full accent-purple-600 bg-slate-200 rounded-lg cursor-pointer h-2"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Max Tree Depth</span>
              <span className="text-purple-700 font-bold">{maxDepth}</span>
            </div>
            <input
              type="range"
              min="4"
              max="20"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full accent-purple-600 bg-slate-200 rounded-lg cursor-pointer h-2"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Learning Rate</span>
              <span className="text-purple-700 font-bold">{learningRate}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              className="w-full accent-purple-600 bg-slate-200 rounded-lg cursor-pointer h-2"
            />
          </div>
        </div>

        {/* Metrics Score Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Accuracy</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">{(metrics.accuracy * 100).toFixed(1)}%</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Precision</span>
            <span className="text-2xl font-bold text-purple-600 mt-1 block">{(metrics.precision * 100).toFixed(1)}%</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Recall</span>
            <span className="text-2xl font-bold text-indigo-600 mt-1 block">{(metrics.recall * 100).toFixed(1)}%</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center shadow-xs">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">F1-Score</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">{(metrics.f1Score * 100).toFixed(1)}%</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center col-span-2 sm:col-span-1 shadow-xs">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">ROC-AUC Score</span>
            <span className="text-2xl font-bold text-purple-700 mt-1 block">{metrics.rocAuc}</span>
          </div>
        </div>

        {/* Evaluation Visuals Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* ROC Curve Chart */}
          <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
              <span>Receiver Operating Characteristic (ROC Curve)</span>
              <span className="text-purple-700 font-bold text-[11px]">AUC = {metrics.rocAuc}</span>
            </h4>
            <div className="h-56">
              <Line
                data={rocData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { title: { display: true, text: 'False Positive Rate (FPR)', color: '#64748b' }, ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } },
                    y: { title: { display: true, text: 'True Positive Rate (TPR)', color: '#64748b' }, ticks: { color: '#64748b' }, grid: { color: '#f1f5f9' } }
                  },
                  plugins: { legend: { labels: { color: '#64748b' } } }
                }}
              />
            </div>
          </div>

          {/* Confusion Matrix Table */}
          <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Confusion Matrix Evaluation
              </h4>
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block uppercase font-bold">True Negative (Retained)</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">{metrics.confusionMatrix.trueNegative}</span>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <span className="text-[10px] text-rose-800 block uppercase font-bold">False Positive (Type I)</span>
                  <span className="text-xl font-bold text-rose-600 mt-1 block">{metrics.confusionMatrix.falsePositive}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-amber-800 block uppercase font-bold">False Negative (Type II)</span>
                  <span className="text-xl font-bold text-amber-600 mt-1 block">{metrics.confusionMatrix.falseNegative}</span>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] text-emerald-800 block uppercase font-bold">True Positive (Churn Caught)</span>
                  <span className="text-xl font-bold text-emerald-600 mt-1 block">{metrics.confusionMatrix.truePositive}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 border-t border-slate-100 pt-2 font-medium">
              Tested on holdout validation set of <strong className="text-slate-700">{metrics.datasetSize}</strong> accounts. Last trained: {new Date(metrics.trainedAt).toLocaleTimeString()}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
