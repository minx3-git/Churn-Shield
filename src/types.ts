export type RiskCategory = 'Low' | 'Medium' | 'High' | 'Critical';
export type CustomerPlan = 'Starter' | 'Growth' | 'Enterprise';
export type PaymentStatus = 'Current' | 'Overdue' | 'Failed';
export type ContractType = 'Monthly' | 'Annual';
export type SegmentType = 'Champions' | 'Loyal' | 'At-Risk' | 'Needs Attention' | 'Inactive';

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  avatar: string;
  plan: CustomerPlan;
  monthlySpend: number;
  tenureMonths: number;
  lastLoginDaysAgo: number;
  supportTickets: number;
  npsScore: number; // 0 - 10
  usageScore: number; // 0 - 100
  featureAdoptionScore: number; // 0 - 100
  paymentStatus: PaymentStatus;
  contractType: ContractType;
  churnRiskScore: number; // 0 - 100
  churnRiskCategory: RiskCategory;
  primaryRiskFactor: string;
  segment: SegmentType;
  joinDate: string;
  notes?: string;
  timeline?: { date: string; event: string; type: 'positive' | 'warning' | 'negative' }[];
}

export interface MLModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  datasetSize: number;
  trainedAt: string;
  algorithm: 'Random Forest Classifier' | 'Gradient Boosting' | 'Logistic Regression';
  hyperparameters: {
    nEstimators: number;
    maxDepth: number;
    learningRate: number;
  };
  featureImportances: { feature: string; weight: number; label: string }[];
  confusionMatrix: {
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
    truePositive: number;
  };
  rocCurveData: { fpr: number; tpr: number }[];
}

export interface RetentionPlaybook {
  id: string;
  title: string;
  targetSegment: SegmentType | 'All High-Risk';
  minRiskScore: number;
  actionType: 'Email Discount' | 'Executive Call' | 'In-App Banner' | 'Feature Trial Grant' | 'Dedicated Onboarding';
  description: string;
  predictedSuccessRate: number; // e.g., 68%
  activeTargetedAccounts: number;
  status: 'Active' | 'Draft' | 'Paused';
  aiGeneratedSubject?: string;
  aiGeneratedEmailBody?: string;
  aiSuggestedIncentive?: string;
}

export interface CohortRetentionData {
  cohort: string; // e.g., "Jan 2025"
  initialSize: number;
  retentionRates: number[]; // Month 1 to Month 6 percentages
}

export interface ChurnPredictionResult {
  churnRiskScore: number;
  churnRiskCategory: RiskCategory;
  primaryRiskFactor: string;
  featureContributions: { feature: string; label: string; impact: number }[];
  aiAnalysis?: string;
  recommendedIncentive?: string;
  winBackEmail?: {
    subject: string;
    body: string;
  };
}

export interface ExecutiveAiInsights {
  summary: string;
  topRiskFactors: string[];
  recommendedActions: { action: string; impact: string; priority: 'High' | 'Medium' | 'Low' }[];
  projectedRevenueSaved: number;
}
