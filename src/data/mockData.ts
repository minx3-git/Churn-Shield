import { Customer, MLModelMetrics, RetentionPlaybook, CohortRetentionData } from '../types';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'CUST-1001',
    name: 'Sarah Jenkins',
    email: 's.jenkins@apexglobal.io',
    company: 'Apex Global Logistics',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    plan: 'Enterprise',
    monthlySpend: 4200,
    tenureMonths: 18,
    lastLoginDaysAgo: 24,
    supportTickets: 8,
    npsScore: 3,
    usageScore: 28,
    featureAdoptionScore: 35,
    paymentStatus: 'Overdue',
    contractType: 'Annual',
    churnRiskScore: 89,
    churnRiskCategory: 'Critical',
    primaryRiskFactor: 'High Support Friction & Drop in Usage',
    segment: 'At-Risk',
    joinDate: '2023-08-15',
    notes: 'Account manager flagged customer frustration with API v2 rate limits.',
    timeline: [
      { date: '2025-02-18', event: 'Payment status changed to Overdue', type: 'negative' },
      { date: '2025-02-10', event: 'Submitted 3 urgent support tickets regarding Webhook failures', type: 'warning' },
      { date: '2025-01-22', event: 'Monthly active user logins dropped by 45%', type: 'negative' },
      { date: '2024-08-15', event: 'Renewed Enterprise Annual Contract', type: 'positive' }
    ]
  },
  {
    id: 'CUST-1002',
    name: 'Marcus Vance',
    email: 'mvance@nexustech.co',
    company: 'Nexus Tech Solutions',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    plan: 'Growth',
    monthlySpend: 1250,
    tenureMonths: 9,
    lastLoginDaysAgo: 14,
    supportTickets: 5,
    npsScore: 5,
    usageScore: 42,
    featureAdoptionScore: 48,
    paymentStatus: 'Current',
    contractType: 'Monthly',
    churnRiskScore: 72,
    churnRiskCategory: 'High',
    primaryRiskFactor: 'Short Tenure & Low Feature Utilization',
    segment: 'Needs Attention',
    joinDate: '2024-05-10',
    notes: 'Needs guided onboarding for advanced analytics module.',
    timeline: [
      { date: '2025-02-14', event: 'Low usage warning triggered (No logins in 14 days)', type: 'warning' },
      { date: '2025-01-05', event: 'Downgraded seat count from 25 to 10', type: 'negative' }
    ]
  },
  {
    id: 'CUST-1003',
    name: 'Elena Rostova',
    email: 'elena@cloudmatrix.org',
    company: 'CloudMatrix Inc.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    plan: 'Enterprise',
    monthlySpend: 6800,
    tenureMonths: 32,
    lastLoginDaysAgo: 1,
    supportTickets: 1,
    npsScore: 10,
    usageScore: 94,
    featureAdoptionScore: 91,
    paymentStatus: 'Current',
    contractType: 'Annual',
    churnRiskScore: 8,
    churnRiskCategory: 'Low',
    primaryRiskFactor: 'None - Healthy Advocate',
    segment: 'Champions',
    joinDate: '2022-06-01',
    notes: 'Power user. Recommended for case study testimonial.',
    timeline: [
      { date: '2025-02-20', event: 'Expanded contract to include Security Add-on (+$1200/mo)', type: 'positive' },
      { date: '2025-02-01', event: 'Gave 10/10 NPS Rating', type: 'positive' }
    ]
  },
  {
    id: 'CUST-1004',
    name: 'David Chen',
    email: 'd.chen@finovate.io',
    company: 'Finovate Analytics',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    plan: 'Growth',
    monthlySpend: 1500,
    tenureMonths: 14,
    lastLoginDaysAgo: 31,
    supportTickets: 6,
    npsScore: 2,
    usageScore: 19,
    featureAdoptionScore: 30,
    paymentStatus: 'Failed',
    contractType: 'Monthly',
    churnRiskScore: 94,
    churnRiskCategory: 'Critical',
    primaryRiskFactor: 'Payment Failure & Long Inactivity',
    segment: 'At-Risk',
    joinDate: '2023-12-11',
    notes: 'Credit card transaction declined twice. Inactivity threshold exceeded.',
    timeline: [
      { date: '2025-02-15', event: 'Recurring charge declined (Payment Failed)', type: 'negative' },
      { date: '2025-01-20', event: 'Account inactive for >30 days', type: 'negative' }
    ]
  },
  {
    id: 'CUST-1005',
    name: 'Amara Okafor',
    email: 'amara@pulsehealth.med',
    company: 'Pulse Health Media',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    plan: 'Starter',
    monthlySpend: 490,
    tenureMonths: 6,
    lastLoginDaysAgo: 3,
    supportTickets: 2,
    npsScore: 8,
    usageScore: 78,
    featureAdoptionScore: 65,
    paymentStatus: 'Current',
    contractType: 'Monthly',
    churnRiskScore: 22,
    churnRiskCategory: 'Low',
    primaryRiskFactor: 'Low Spend Account - High Growth Potential',
    segment: 'Loyal',
    joinDate: '2024-08-20',
    notes: 'Approaching plan usage caps. Good candidate for Growth upgrade.',
    timeline: [
      { date: '2025-02-12', event: 'Reached 90% of Starter API quota', type: 'warning' }
    ]
  },
  {
    id: 'CUST-1006',
    name: 'Robert Thorne',
    email: 'rthorne@hyperiondynamics.com',
    company: 'Hyperion Dynamics',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    plan: 'Enterprise',
    monthlySpend: 5400,
    tenureMonths: 22,
    lastLoginDaysAgo: 19,
    supportTickets: 9,
    npsScore: 4,
    usageScore: 38,
    featureAdoptionScore: 50,
    paymentStatus: 'Current',
    contractType: 'Annual',
    churnRiskScore: 81,
    churnRiskCategory: 'Critical',
    primaryRiskFactor: 'Unresolved High-Severity Support Tickets',
    segment: 'At-Risk',
    joinDate: '2023-04-05',
    notes: 'Executive sponsor left the company last month.',
    timeline: [
      { date: '2025-02-08', event: 'Main point of contact email bounced (Stakeholder Change)', type: 'negative' },
      { date: '2025-01-30', event: 'Opened Ticket #892: High Latency in EU Region', type: 'warning' }
    ]
  },
  {
    id: 'CUST-1007',
    name: 'Chloe Bennett',
    email: 'chloe@velocityads.agency',
    company: 'Velocity Ad Agency',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    plan: 'Growth',
    monthlySpend: 1800,
    tenureMonths: 11,
    lastLoginDaysAgo: 5,
    supportTickets: 1,
    npsScore: 7,
    usageScore: 68,
    featureAdoptionScore: 72,
    paymentStatus: 'Current',
    contractType: 'Monthly',
    churnRiskScore: 34,
    churnRiskCategory: 'Medium',
    primaryRiskFactor: 'Upcoming Contract Renewal Competitor Evaluation',
    segment: 'Loyal',
    joinDate: '2024-03-18',
    notes: 'Requested product comparison documentation.',
    timeline: [
      { date: '2025-02-02', event: 'Downloaded Export Data backup', type: 'warning' }
    ]
  },
  {
    id: 'CUST-1008',
    name: 'Vikram Patel',
    email: 'vikram@quantumleap.tech',
    company: 'QuantumLeap AI',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    plan: 'Enterprise',
    monthlySpend: 8900,
    tenureMonths: 40,
    lastLoginDaysAgo: 0,
    supportTickets: 0,
    npsScore: 9,
    usageScore: 98,
    featureAdoptionScore: 96,
    paymentStatus: 'Current',
    contractType: 'Annual',
    churnRiskScore: 5,
    churnRiskCategory: 'Low',
    primaryRiskFactor: 'None - Anchor Account',
    segment: 'Champions',
    joinDate: '2021-10-10',
    notes: 'Co-marketing partner for Q2 webinar.',
    timeline: [
      { date: '2025-02-19', event: 'Invited 12 new team members', type: 'positive' }
    ]
  }
];

export const INITIAL_ML_METRICS: MLModelMetrics = {
  accuracy: 0.924,
  precision: 0.891,
  recall: 0.876,
  f1Score: 0.883,
  rocAuc: 0.948,
  datasetSize: 4850,
  trainedAt: '2025-02-22T08:30:00Z',
  algorithm: 'Random Forest Classifier',
  hyperparameters: {
    nEstimators: 150,
    maxDepth: 12,
    learningRate: 0.05
  },
  featureImportances: [
    { feature: 'lastLoginDaysAgo', label: 'Inactivity (Days Since Last Login)', weight: 0.28 },
    { feature: 'supportTickets', label: 'Unresolved Support Tickets', weight: 0.21 },
    { feature: 'usageScore', label: 'Product Usage & Feature Score', weight: 0.19 },
    { feature: 'npsScore', label: 'NPS / Customer Satisfaction', weight: 0.14 },
    { feature: 'paymentStatus', label: 'Payment Status (Overdue/Failed)', weight: 0.10 },
    { feature: 'contractType', label: 'Contract Type (Monthly vs Annual)', weight: 0.08 }
  ],
  confusionMatrix: {
    trueNegative: 3620,
    falsePositive: 210,
    falseNegative: 125,
    truePositive: 895
  },
  rocCurveData: [
    { fpr: 0.0, tpr: 0.0 },
    { fpr: 0.02, tpr: 0.25 },
    { fpr: 0.05, tpr: 0.58 },
    { fpr: 0.10, tpr: 0.82 },
    { fpr: 0.15, tpr: 0.91 },
    { fpr: 0.25, tpr: 0.96 },
    { fpr: 0.50, tpr: 0.98 },
    { fpr: 1.0, tpr: 1.0 }
  ]
};

export const INITIAL_PLAYBOOKS: RetentionPlaybook[] = [
  {
    id: 'PB-01',
    title: 'High-Value Enterprise VIP Executive Intervention',
    targetSegment: 'At-Risk',
    minRiskScore: 75,
    actionType: 'Executive Call',
    description: 'Trigger immediate outreach from VP of Customer Success for Enterprise accounts spending >$3,000/mo with elevated risk.',
    predictedSuccessRate: 74,
    activeTargetedAccounts: 12,
    status: 'Active',
    aiGeneratedSubject: 'Exclusive Product Roadmap Sync & Dedicated Support Review',
    aiGeneratedEmailBody: 'Hi {{Customer_Name}},\n\nI noticed your team recently encountered a few friction points with our platform integration. As your dedicated Executive Sponsor, I want to ensure we are delivering 100% value to {{Company}}.\n\nCould we schedule a brief 15-minute alignment call this week?',
    aiSuggestedIncentive: 'Free 3-month Dedicated Solutions Architect Consultation + Priority SLA Upgrade'
  },
  {
    id: 'PB-02',
    title: 'Automated Overdue Payment Recovery & Amnesty',
    targetSegment: 'All High-Risk',
    minRiskScore: 70,
    actionType: 'Email Discount',
    description: 'Send automated reminder with 1-click update payment link + 15% billing credit if updated within 48 hours.',
    predictedSuccessRate: 82,
    activeTargetedAccounts: 8,
    status: 'Active',
    aiGeneratedSubject: 'Action Required: Update payment method for {{Company}}',
    aiGeneratedEmailBody: 'Hi {{Customer_Name}},\n\nWe were unable to process your recent invoice for {{Company}}. To avoid service interruption, please update your billing details below. Apply code STAY15 for 15% off your next renewal invoice.',
    aiSuggestedIncentive: '15% Discount on current billing cycle'
  },
  {
    id: 'PB-03',
    title: 'Inactivity Re-Engagement & Guided Feature Walkthrough',
    targetSegment: 'Needs Attention',
    minRiskScore: 50,
    actionType: 'In-App Banner',
    description: 'Target accounts with low usage (<40 score) and inactive for >10 days with interactive product tour prompt.',
    predictedSuccessRate: 61,
    activeTargetedAccounts: 24,
    status: 'Active',
    aiGeneratedSubject: 'Unlock hidden power features in ChurnShield',
    aiGeneratedEmailBody: 'Hi {{Customer_Name}},\n\nYour team hasn’t tried our automated workflow triggers yet! Schedule a 1-on-1 walkthrough with an onboarding specialist.',
    aiSuggestedIncentive: 'Free unlock of Advanced Automation Module for 30 days'
  }
];

export const COHORT_DATA: CohortRetentionData[] = [
  { cohort: 'Sep 2024', initialSize: 120, retentionRates: [100, 92, 86, 82, 79, 76] },
  { cohort: 'Oct 2024', initialSize: 145, retentionRates: [100, 94, 88, 85, 81, 78] },
  { cohort: 'Nov 2024', initialSize: 160, retentionRates: [100, 91, 84, 80, 77, 74] },
  { cohort: 'Dec 2024', initialSize: 180, retentionRates: [100, 95, 90, 87, 84, 82] },
  { cohort: 'Jan 2025', initialSize: 210, retentionRates: [100, 96, 92, 89, 86, 84] },
  { cohort: 'Feb 2025', initialSize: 235, retentionRates: [100, 97, 94, 91, 89, 87] }
];
