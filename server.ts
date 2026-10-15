import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CUSTOMERS, INITIAL_ML_METRICS, INITIAL_PLAYBOOKS } from './src/data/mockData';
import { Customer, MLModelMetrics, RetentionPlaybook } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory data store for live modifications during user session
let customersStore: Customer[] = [...INITIAL_CUSTOMERS];
let mlMetricsStore: MLModelMetrics = { ...INITIAL_ML_METRICS };
let playbooksStore: RetentionPlaybook[] = [...INITIAL_PLAYBOOKS];

// Helper to initialize Gemini Client with standard telemetry header
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to try gemini-3.1-flash-lite, gemini-3.8-flash on rate limits or high demand
let quotaExhaustedUntil = 0;

function cleanAndParseJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function generateContentWithModelFallback(ai: any, params: { contents: any; config?: any }) {
  if (Date.now() < quotaExhaustedUntil) {
    throw new Error('API_QUOTA_EXHAUSTED_CIRCUIT_BREAKER');
  }

  // Recommended per gemini-api skill: gemini-3.1-flash-lite (fast & reliable), gemini-3.8-flash
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const callPromise = ai.models.generateContent({
        model,
        contents: params.contents,
        ...(params.config ? { config: params.config } : {})
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), 12000)
      );

      const response: any = await Promise.race([callPromise, timeoutPromise]);
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err);
      const isQuotaOrTimeout = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded');
      if (isQuotaOrTimeout) {
        // Pause briefly for 5 seconds on quota errors
        quotaExhaustedUntil = Date.now() + 5000;
        break;
      }
    }
  }
  throw lastError;
}

// -------------------------------------------------------------
// API ENDPOINTS (MUST BE REGISTERED BEFORE VITE MIDDLEWARE)
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// GET all customers
app.get('/api/customers', (req: Request, res: Response) => {
  res.json({ customers: customersStore, totalCount: customersStore.length });
});

// POST bulk upload/replace customers (e.g. from large CSV import)
app.post('/api/customers/bulk', (req: Request, res: Response) => {
  const { customers, mode } = req.body as { customers: Customer[]; mode?: 'replace' | 'append' };
  
  if (!Array.isArray(customers) || customers.length === 0) {
    return res.status(400).json({ error: 'Valid array of customers required.' });
  }

  if (mode === 'append') {
    customersStore = [...customers, ...customersStore];
  } else {
    // Default: replace active dataset with newly imported dataset
    customersStore = [...customers];
  }

  // Update ML metrics dataset size to match current active cohort
  mlMetricsStore.datasetSize = customersStore.length;
  mlMetricsStore.trainedAt = new Date().toISOString();

  const highRiskCount = customersStore.filter(c => c.churnRiskScore >= 60).length;

  res.status(200).json({
    success: true,
    count: customersStore.length,
    highRiskCount,
    message: `Successfully loaded ${customers.length} customer records into ChurnShield intelligence engine.`
  });
});

// POST reset customers to default benchmark
app.post('/api/customers/reset', (req: Request, res: Response) => {
  customersStore = [...INITIAL_CUSTOMERS];
  mlMetricsStore.datasetSize = customersStore.length;
  res.json({ success: true, count: customersStore.length, customers: customersStore });
});

// POST add new customer
app.post('/api/customers', (req: Request, res: Response) => {
  const newCustData = req.body as Partial<Customer>;
  const newId = `CUST-${1000 + customersStore.length + 1}`;
  
  // Calculate Churn Risk Score
  const lastLogin = newCustData.lastLoginDaysAgo ?? 0;
  const tickets = newCustData.supportTickets ?? 0;
  const usage = newCustData.usageScore ?? 50;
  const nps = newCustData.npsScore ?? 7;
  const payment = newCustData.paymentStatus ?? 'Current';
  
  let riskScore = Math.min(
    100,
    Math.max(
      5,
      Math.round(
        lastLogin * 2.2 +
        tickets * 6.5 +
        (100 - usage) * 0.4 +
        (10 - nps) * 4.5 +
        (payment === 'Overdue' ? 25 : payment === 'Failed' ? 40 : 0)
      )
    )
  );
  
  let category: Customer['churnRiskCategory'] = 'Low';
  if (riskScore >= 75) category = 'Critical';
  else if (riskScore >= 60) category = 'High';
  else if (riskScore >= 35) category = 'Medium';
  
  let segment: Customer['segment'] = 'Loyal';
  if (riskScore >= 70) segment = 'At-Risk';
  else if (riskScore >= 45) segment = 'Needs Attention';
  else if (usage >= 85 && nps >= 8) segment = 'Champions';

  const customer: Customer = {
    id: newId,
    name: newCustData.name || 'New Customer',
    email: newCustData.email || 'user@example.com',
    company: newCustData.company || 'Acme Corp',
    avatar: newCustData.avatar || `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?w=150&auto=format&fit=crop&q=80`,
    plan: newCustData.plan || 'Growth',
    monthlySpend: newCustData.monthlySpend || 990,
    tenureMonths: newCustData.tenureMonths || 3,
    lastLoginDaysAgo: lastLogin,
    supportTickets: tickets,
    npsScore: nps,
    usageScore: usage,
    featureAdoptionScore: newCustData.featureAdoptionScore || 50,
    paymentStatus: payment,
    contractType: newCustData.contractType || 'Monthly',
    churnRiskScore: riskScore,
    churnRiskCategory: category,
    primaryRiskFactor: tickets > 4 ? 'High Support Friction' : lastLogin > 14 ? 'Inactivity' : 'Low Feature Utilization',
    segment: segment,
    joinDate: new Date().toISOString().split('T')[0],
    notes: newCustData.notes || 'Created via ChurnShield portal.',
    timeline: [
      { date: new Date().toISOString().split('T')[0], event: 'Customer profile registered', type: 'positive' }
    ]
  };

  customersStore.unshift(customer);
  res.status(201).json({ customer });
});

// PUT update customer
app.put('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = customersStore.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const updatedData = req.body;
  customersStore[index] = { ...customersStore[index], ...updatedData };
  res.json({ customer: customersStore[index] });
});

// DELETE customer
app.delete('/api/customers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  customersStore = customersStore.filter(c => c.id !== id);
  res.json({ success: true, id });
});

// POST predict churn for custom inputs
app.post('/api/predict-churn', (req: Request, res: Response) => {
  const { lastLoginDaysAgo, supportTickets, usageScore, npsScore, paymentStatus, contractType, tenureMonths, monthlySpend } = req.body;

  const lastLogin = Number(lastLoginDaysAgo) || 0;
  const tickets = Number(supportTickets) || 0;
  const usage = Number(usageScore) || 50;
  const nps = Number(npsScore) || 5;
  const tenure = Number(tenureMonths) || 12;
  const spend = Number(monthlySpend) || 1000;

  // ML Scoring calculation logic
  const loginImpact = Math.min(35, lastLogin * 1.5);
  const ticketImpact = Math.min(30, tickets * 4.5);
  const usageImpact = Math.min(25, (100 - usage) * 0.3);
  const npsImpact = Math.min(20, (10 - nps) * 2.0);
  const paymentImpact = paymentStatus === 'Failed' ? 30 : paymentStatus === 'Overdue' ? 18 : 0;
  const contractDiscount = contractType === 'Annual' ? -10 : 0;
  const tenureDiscount = tenure > 24 ? -12 : tenure > 12 ? -5 : 5;

  let rawScore = Math.round(loginImpact + ticketImpact + usageImpact + npsImpact + paymentImpact + contractDiscount + tenureDiscount);
  const riskScore = Math.min(99, Math.max(1, rawScore));

  let category: Customer['churnRiskCategory'] = 'Low';
  if (riskScore >= 75) category = 'Critical';
  else if (riskScore >= 60) category = 'High';
  else if (riskScore >= 35) category = 'Medium';

  let primaryFactor = 'Healthy Account Engagement';
  if (paymentStatus === 'Failed' || paymentStatus === 'Overdue') primaryFactor = `Payment Failure (${paymentStatus})`;
  else if (tickets >= 5) primaryFactor = `High Unresolved Support Tickets (${tickets})`;
  else if (lastLogin >= 14) primaryFactor = `Severe Inactivity (${lastLogin} days since login)`;
  else if (usage <= 35) primaryFactor = `Low Product Usage Score (${usage}%)`;
  else if (nps <= 4) primaryFactor = `Low NPS / Dissatisfaction (${nps}/10)`;

  const featureContributions = [
    { feature: 'lastLoginDaysAgo', label: 'Inactivity Duration', impact: Math.round(loginImpact) },
    { feature: 'supportTickets', label: 'Support Friction', impact: Math.round(ticketImpact) },
    { feature: 'usageScore', label: 'Low Product Usage', impact: Math.round(usageImpact) },
    { feature: 'paymentStatus', label: 'Payment Risk', impact: Math.round(paymentImpact) },
    { feature: 'npsScore', label: 'Low NPS Rating', impact: Math.round(npsImpact) }
  ].sort((a, b) => b.impact - a.impact);

  res.json({
    churnRiskScore: riskScore,
    churnRiskCategory: category,
    primaryRiskFactor: primaryFactor,
    featureContributions
  });
});

// POST Retrain ML Model (Hyperparameter Tuning & Metrics update)
app.post('/api/ml-retrain', (req: Request, res: Response) => {
  const { nEstimators, maxDepth, learningRate, algorithm } = req.body;

  const nTrees = Number(nEstimators) || 150;
  const depth = Number(maxDepth) || 12;
  const lr = Number(learningRate) || 0.05;

  // ML metric simulation based on model capacity
  const baseAcc = 0.88 + Math.min(0.06, (nTrees / 300) * 0.04 + (depth / 20) * 0.03);
  const precision = Math.min(0.96, baseAcc - 0.02);
  const recall = Math.min(0.95, baseAcc - 0.03);
  const f1 = (2 * precision * recall) / (precision + recall);
  const rocAuc = Math.min(0.98, baseAcc + 0.03);

  mlMetricsStore = {
    ...mlMetricsStore,
    accuracy: Number(baseAcc.toFixed(3)),
    precision: Number(precision.toFixed(3)),
    recall: Number(recall.toFixed(3)),
    f1Score: Number(f1.toFixed(3)),
    rocAuc: Number(rocAuc.toFixed(3)),
    datasetSize: customersStore.length,
    trainedAt: new Date().toISOString(),
    algorithm: algorithm || 'Random Forest Classifier',
    hyperparameters: {
      nEstimators: nTrees,
      maxDepth: depth,
      learningRate: lr
    }
  };

  res.json({ metrics: mlMetricsStore });
});

// POST Executive AI Insights (using Gemini 3.8 Flash with active cohort grounding)
app.post('/api/ai/executive-insights', async (req: Request, res: Response) => {
  const { customersCount, highRiskCount, totalArrAtRisk, sampleCustomers } = req.body || {};
  const activeCount = Number(customersCount) > 0 ? Number(customersCount) : customersStore.length;
  const defaultHighRisk = customersStore.filter(c => c.churnRiskScore >= 60);
  const activeHighRiskCount = typeof highRiskCount === 'number' ? highRiskCount : defaultHighRisk.length;
  const activeArrAtRisk = typeof totalArrAtRisk === 'number' ? totalArrAtRisk : defaultHighRisk.reduce((acc, c) => acc + (c.monthlySpend * 12), 0);
  const percentAtRisk = activeCount > 0 ? Math.round((activeHighRiskCount / activeCount) * 100) : 0;
  const profiles = Array.isArray(sampleCustomers) && sampleCustomers.length > 0 ? sampleCustomers : defaultHighRisk.slice(0, 6);

  const buildFallbackInsights = () => ({
    summary: `Active intelligence monitoring ${activeCount.toLocaleString()} customer accounts: identified ${activeHighRiskCount.toLocaleString()} vulnerable accounts (${percentAtRisk}%) representing $${activeArrAtRisk.toLocaleString()} in annualized revenue at risk. Immediate proactive retention intervention is recommended.`,
    topRiskFactors: [
      "Inactivity & missing recent user logins (>14 days)",
      "Unresolved support tickets & onboarding friction",
      "Overdue billing & recurring payment transaction declines"
    ],
    recommendedActions: [
      { action: "Deploy automated payment amnesty discount (15%) for overdue accounts", impact: `+$${Math.max(12000, Math.round(activeArrAtRisk * 0.18)).toLocaleString()} Saved ARR`, priority: "High" },
      { action: "Schedule executive retention check-ins with top vulnerable accounts", impact: `+$${Math.max(10000, Math.round(activeArrAtRisk * 0.15)).toLocaleString()} Saved ARR`, priority: "High" },
      { action: "Launch guided in-app re-engagement workflows for inactive users", impact: `+$${Math.max(5000, Math.round(activeArrAtRisk * 0.08)).toLocaleString()} Saved ARR`, priority: "Medium" }
    ],
    projectedRevenueSaved: Math.max(25000, Math.round(activeArrAtRisk * 0.35))
  });

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json(buildFallbackInsights());
    }

    const prompt = `You are the lead Machine Learning & Retention Data Scientist for ChurnShield, a Customer Intelligence SaaS Platform.
    Analyze the following customer metrics summary:
    - Total Active Monitored Customers: ${activeCount.toLocaleString()}
    - High & Critical Risk Accounts: ${activeHighRiskCount.toLocaleString()} (${percentAtRisk}% of cohort)
    - Annualized Revenue at Risk: $${activeArrAtRisk.toLocaleString()}
    - Sample High-Risk Customer Profiles: ${JSON.stringify(profiles.slice(0, 6))}

    Provide a concise executive summary formatted strictly as JSON matching this structure:
    {
      "summary": "1-2 sentence executive overview mentioning ${activeCount.toLocaleString()} active accounts and customer health",
      "topRiskFactors": ["Factor 1", "Factor 2", "Factor 3"],
      "recommendedActions": [
        { "action": "Specific action name", "impact": "e.g., +$12,000 Saved ARR", "priority": "High" },
        { "action": "Specific action name", "impact": "e.g., +$8,500 Saved ARR", "priority": "High" },
        { "action": "Specific action name", "impact": "e.g., +$5,000 Saved ARR", "priority": "Medium" }
      ],
      "projectedRevenueSaved": ${Math.max(25000, Math.round(activeArrAtRisk * 0.35))}
    }`;

    const response = await generateContentWithModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const parsed = JSON.parse(text);
    if (!parsed || !parsed.summary) {
      return res.json(buildFallbackInsights());
    }
    res.json(parsed);
  } catch (error: any) {
    console.log('[Fallback] Serving data-driven executive insights for active cohort');
    res.json(buildFallbackInsights());
  }
});

// POST Customer AI Strategy & Win-Back Email (using Gemini 3.8 Flash)
app.post('/api/ai/customer-strategy', async (req: Request, res: Response) => {
  const { customerId, customer: providedCustomer } = req.body;
  const customer = providedCustomer || customersStore.find(c => c.id === customerId);

  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({
        aiAnalysis: `${customer.name} from ${customer.company} (${customer.plan} Plan, $${customer.monthlySpend}/mo) has a Churn Risk Score of ${customer.churnRiskScore}%. Primary churn driver is '${customer.primaryRiskFactor}'. Their last login was ${customer.lastLoginDaysAgo} days ago and they have ${customer.supportTickets} support tickets.`,
        recommendedIncentive: customer.plan === 'Enterprise' ? 'Free 2-month dedicated TAM & 20% contract credit' : '1-on-1 onboarding session & 15% discount',
        winBackEmail: {
          subject: `Dedicated Partner Review & Support for ${customer.company}`,
          body: `Hi ${customer.name},\n\nI hope you're having a great week! I wanted to personally reach out regarding ${customer.company}'s account.\n\nWe noticed you recently logged ${customer.supportTickets} support queries regarding technical setup. We want to ensure your team has everything required to get maximum value from your ${customer.plan} plan.\n\nCould I offer a quick 10-minute walkthrough, along with a 15% courtesy credit on your next invoice?\n\nWarmly,\nCustomer Retention Team`
        }
      });
    }

    const prompt = `You are an expert Customer Success & Churn Retention Advisor.
    Analyze this specific customer account:
    - Customer Name: ${customer.name}
    - Company: ${customer.company}
    - Email: ${customer.email}
    - Plan: ${customer.plan} ($${customer.monthlySpend}/month)
    - Tenure: ${customer.tenureMonths} months
    - Churn Risk Score: ${customer.churnRiskScore}% (${customer.churnRiskCategory} Risk)
    - Last Login: ${customer.lastLoginDaysAgo} days ago
    - Support Tickets: ${customer.supportTickets}
    - NPS Score: ${customer.npsScore}/10
    - Usage Score: ${customer.usageScore}/100
    - Payment Status: ${customer.paymentStatus}
    - Primary Risk Factor: ${customer.primaryRiskFactor}

    Provide a tailored retention analysis and personalized executive win-back email template strictly in JSON format matching this schema:
    {
      "aiAnalysis": "Detailed 2-3 sentence analysis explaining root cause of churn risk and recommended angle of approach",
      "recommendedIncentive": "Targeted retention offer tailored to plan tier",
      "winBackEmail": {
        "subject": "Compelling non-spammy subject line",
        "body": "Empathetic, highly personalized email body targeting customer pain points"
      }
    }`;

    const response = await generateContentWithModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text || '';
    const parsed = cleanAndParseJson(text);
    res.json(parsed);
  } catch (error: any) {
    console.log('[Fallback] Serving data-driven customer strategy:', error?.message || error);
    res.json({
      aiAnalysis: `${customer.name} from ${customer.company} (${customer.plan} Plan, $${customer.monthlySpend}/mo) has a Churn Risk Score of ${customer.churnRiskScore}%. Primary churn driver is '${customer.primaryRiskFactor}'. Last login was ${customer.lastLoginDaysAgo} days ago with ${customer.supportTickets} open support tickets.`,
      recommendedIncentive: customer.plan === 'Enterprise' ? 'Free 2-month dedicated account review & 20% credit' : '1-on-1 setup call & 15% renewal discount',
      winBackEmail: {
        subject: `Personal Check-in & Dedicated Support for ${customer.company}`,
        body: `Hi ${customer.name},\n\nI hope you're having a wonderful week! I wanted to personally reach out regarding ${customer.company}'s account.\n\nWe noticed you haven't logged in recently and have ${customer.supportTickets} open support tickets. We really value your partnership and want to make sure everything runs smoothly for your team.\n\nCould I set up a quick 10-minute check-in call, or offer a 15% discount credit on your next monthly bill?\n\nWarmly,\nYour Customer Support Team`
      }
    });
  }
});

// POST Generate AI Retention Playbook (using Gemini 3.6 Flash)
app.post('/api/ai/generate-playbook', async (req: Request, res: Response) => {
  const { targetSegment, riskThreshold, playbookName } = req.body || {};
  try {
    const ai = getGeminiClient();

    if (!ai) {
      const newPlaybook: RetentionPlaybook = {
        id: `PB-0${playbooksStore.length + 1}`,
        title: playbookName || `Targeted ${targetSegment} Save Campaign`,
        targetSegment: targetSegment || 'At-Risk',
        minRiskScore: riskThreshold || 65,
        actionType: 'Executive Call',
        description: 'AI-generated proactive retention playbook with automated email outreach and priority escalation.',
        predictedSuccessRate: 76,
        activeTargetedAccounts: customersStore.filter(c => c.churnRiskScore >= (riskThreshold || 65)).length,
        status: 'Active',
        aiGeneratedSubject: `Priority Support & Executive Review for your account`,
        aiGeneratedEmailBody: `Hi {{Customer_Name}},\n\nWe want to ensure your team at {{Company}} is achieving maximum return on investment. Let us review your current workflow to optimize performance.`,
        aiSuggestedIncentive: '15% billing credit on next renewal'
      };
      playbooksStore.unshift(newPlaybook);
      return res.json({ playbook: newPlaybook });
    }

    const prompt = `You are a Retention Marketing Specialist for B2B SaaS.
    Generate a new retention playbook for target segment: "${targetSegment}" with risk threshold >= ${riskThreshold}%.
    Name: "${playbookName || 'Automated Account Recovery'}".

    Return JSON matching this schema:
    {
      "title": "Campaign title",
      "actionType": "Executive Call" | "Email Discount" | "In-App Banner" | "Feature Trial Grant",
      "description": "2 sentence explanation of campaign logic",
      "predictedSuccessRate": 78,
      "aiGeneratedSubject": "Outreach email subject line",
      "aiGeneratedEmailBody": "Outreach email template body with {{Customer_Name}} and {{Company}} placeholders",
      "aiSuggestedIncentive": "Recommended perk/incentive"
    }`;

    const response = await generateContentWithModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    const newPlaybook: RetentionPlaybook = {
      id: `PB-0${playbooksStore.length + 1}`,
      title: parsed.title || playbookName || 'AI Retention Playbook',
      targetSegment: targetSegment || 'At-Risk',
      minRiskScore: riskThreshold || 65,
      actionType: parsed.actionType || 'Executive Call',
      description: parsed.description || 'AI Generated Playbook',
      predictedSuccessRate: parsed.predictedSuccessRate || 75,
      activeTargetedAccounts: customersStore.filter(c => c.churnRiskScore >= (riskThreshold || 65)).length,
      status: 'Active',
      aiGeneratedSubject: parsed.aiGeneratedSubject,
      aiGeneratedEmailBody: parsed.aiGeneratedEmailBody,
      aiSuggestedIncentive: parsed.aiSuggestedIncentive
    };

    playbooksStore.unshift(newPlaybook);
    res.json({ playbook: newPlaybook });
  } catch (error: any) {
    console.log('[Fallback] Serving data-driven playbook');
    const fallbackPlaybook: RetentionPlaybook = {
      id: `PB-0${playbooksStore.length + 1}`,
      title: playbookName || `Targeted Save Campaign`,
      targetSegment: targetSegment || 'At-Risk',
      minRiskScore: riskThreshold || 65,
      actionType: 'Executive Call',
      description: 'Proactive retention campaign with automated email outreach and priority check-in.',
      predictedSuccessRate: 76,
      activeTargetedAccounts: customersStore.filter(c => c.churnRiskScore >= (riskThreshold || 65)).length,
      status: 'Active',
      aiGeneratedSubject: `Priority Support & Review for your account`,
      aiGeneratedEmailBody: `Hi {{Customer_Name}},\n\nWe want to ensure your team at {{Company}} is achieving maximum value. Let us review your current workflow to optimize performance.`,
      aiSuggestedIncentive: '15% billing credit on next renewal'
    };
    playbooksStore.unshift(fallbackPlaybook);
    res.json({ playbook: fallbackPlaybook });
  }
});

// GET Playbooks
app.get('/api/playbooks', (req: Request, res: Response) => {
  res.json({ playbooks: playbooksStore });
});

// POST AI Chatbot Assistant for Small Business Owners
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { message, conversationHistory, customerCount, totalMRR: clientMRR, highRiskCount: clientHighRisk, sampleCustomers } = req.body || {};
  const activeCustomerCount = Number(customerCount) > 0 ? Number(customerCount) : customersStore.length;
  const defaultHighRisk = customersStore.filter(c => c.churnRiskScore >= 60);
  const activeHighRisk = typeof clientHighRisk === 'number' ? clientHighRisk : defaultHighRisk.length;
  const activeMRR = typeof clientMRR === 'number' ? clientMRR : customersStore.reduce((sum, c) => sum + (c.monthlySpend || 0), 0);
  const profiles = Array.isArray(sampleCustomers) && sampleCustomers.length > 0 ? sampleCustomers : defaultHighRisk.slice(0, 5);

  const buildChatFallback = () => {
    const q = (message || '').trim().toLowerCase();

    // Check if user is asking about a specific customer by name or company
    const matchingCustomer = profiles.find((c: any) =>
      (c.name && q.includes(c.name.toLowerCase())) ||
      (c.company && q.includes(c.company.toLowerCase()))
    );

    if (matchingCustomer) {
      return `### Account Analysis: **${matchingCustomer.company}** (${matchingCustomer.name})
- **Monthly Revenue:** $${(matchingCustomer.spend || matchingCustomer.monthlySpend || 1200).toLocaleString()}/mo
- **Plan Tier:** ${matchingCustomer.plan || 'Enterprise'}
- **Churn Probability:** ${matchingCustomer.riskScore || matchingCustomer.churnRiskScore || 75}% (${matchingCustomer.category || 'High'} Risk)
- **Primary Churn Driver:** ${matchingCustomer.primaryRiskFactor || 'Recent decline in product logins & open support tickets'}

**Recommended Strategy:**
1. **Immediate Personal Outreach:** Schedule a 15-minute executive check-in with ${matchingCustomer.name} to unblock their current pain points.
2. **Value Incentive:** Offer a 15% renewal discount or complimentary 60-day feature upgrade before their contract expires.`;
    }

    if (q.includes('low-cost') || q.includes('cheap') || q.includes('inexpensive') || q.includes('free way')) {
      return `### Top 4 High-Impact, Low-Cost Retention Tactics:

1. **The Proactive Executive Check-in (Zero Extra Cost):** Have a customer success lead or founder email at-risk accounts directly when logins drop 14+ days. A personal touch has up to an **85% recovery rate**.
2. **Close the NPS Feedback Loop:** When a customer rates satisfaction $\\le 6$, send an immediate apology email asking for their #1 blocker. Fixing their issue immediately turns detractors into advocates.
3. **Annual Billing Switch Incentive:** Offer 2 months free if they switch from monthly to annual billing—this locks in 12 months of guaranteed revenue and eliminates monthly renewal churn anxiety.
4. **Automated Re-engagement Milestones:** Trigger in-app tips highlighting unused features that high-retention accounts use daily.`;
    }

    if (q.includes('risk') || q.includes('leave') || q.includes('churn') || q.includes('who')) {
      let reply = `Based on your live dataset of **${activeCustomerCount.toLocaleString()} accounts** ($${activeMRR.toLocaleString()}/mo MRR), you currently have **${activeHighRisk.toLocaleString()} accounts** at high or critical churn risk.\n\n**Top Accounts Needing Immediate Attention:**\n`;
      profiles.slice(0, 5).forEach((c: any) => {
        reply += `- **${c.company || 'Enterprise Account'}** (${c.name || 'Account Owner'}): $${(c.spend || c.monthlySpend || 1200).toLocaleString()}/mo • Risk: ${c.riskScore || c.churnRiskScore || 75}% • *${c.primaryRiskFactor || 'Usage decline'}*\n`;
      });
      reply += `\n💡 **Next Step:** Reach out to the top 3 highest-spending at-risk accounts first to protect the largest portion of your recurring revenue.`;
      return reply;
    }

    if (q.includes('email') || q.includes('draft') || q.includes('write') || q.includes('template') || q.includes('message')) {
      const targetCompany = profiles[0]?.company || 'Acme Corp';
      const targetName = profiles[0]?.name || 'there';
      return `Here is a personalized win-back email template tailored to your accounts:

**Subject:** Personal check-in & dedicated support for ${targetCompany}

Hi ${targetName},

I hope you're having a productive week! I noticed your team hasn't been as active on the platform over the past couple of weeks, and I wanted to personally reach out to make sure everything is running smoothly.

Your success is our top priority. Could we schedule a brief 10-minute feedback call this week to review your current setup and clear any roadblocks?

As a thank you for your partnership, I'd also be glad to apply a 15% courtesy credit to your next invoice.

Warm regards,  
Customer Retention & Success Team`;
    }

    if (q.includes('budget') || q.includes('twin') || q.includes('spend') || q.includes('roi')) {
      return `### Retention Budget & ROI Strategy:
- **Optimal Budget:** We recommend starting with **$500 to $2,500/month** depending on your vulnerable revenue pool.
- **Unit Economics:** Reaching an at-risk account with a VIP call costs only ~$10/account, while discount vouchers cost ~$45/account.
- **Projected Return:** With an average customer value of $${Math.round(activeMRR / Math.max(1, activeCustomerCount)).toLocaleString()}/mo, saving even 3 to 5 enterprise accounts generates a **400% to 800% ROI** on your retention budget.
- You can test exact custom budgets in the **Budget Planner & Twin** tab!`;
    }

    if (q.includes('nps') || q.includes('satisfaction') || q.includes('score')) {
      return `### How to Boost Customer Satisfaction & NPS:
1. **Survey at the Right Moment:** Trigger your NPS survey 30–60 days after onboarding or immediately following a successful product milestone—not during a bug or support ticket.
2. **Follow Up with Detractors Within 24 Hours:** A detractor (NPS 0-6) is a customer with an active frustration. Reaching out quickly to resolve it reduces their churn likelihood by over 60%.
3. **Turn Promoters (9-10) into Advocates:** Ask promoters for Google/G2 reviews or offer them referral bonuses while their enthusiasm is high.`;
    }

    // Direct answer for general or custom questions
    return `### AI Advisor Strategy & Recommendations:

Regarding your question about **"${message.replace(/[^\w\s]/gi, '').slice(0, 50)}"**:

In your active cohort of **${activeCustomerCount.toLocaleString()} customers** ($${activeMRR.toLocaleString()}/mo MRR), the primary retention lever is catching drop-offs before contract renewal.

**3 Concrete Action Steps:**
1. **Target the Vulnerable Tier:** Focus your attention on the **${activeHighRisk.toLocaleString()} accounts** currently flagged with elevated churn risk.
2. **Proactive Intervention:** Deploy personal executive outreach for accounts spending >$1,000/mo, and automated renewal discount vouchers for self-serve accounts.
3. **Monitor Usage Frequency:** Weekly active logins are your earliest leading churn indicator. If a customer stops logging in for 10+ days, trigger an automated re-engagement guide.

Feel free to ask me to draft specific customer emails, analyze an individual company, or recommend playbooks for your exact dataset!`;
  };

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ reply: buildChatFallback() });
    }

    const businessContext = `You are an expert AI Business Advisor and Customer Retention Strategist for a business owner using ChurnShield.
    Active Business Dataset:
    - Total Active Accounts: ${activeCustomerCount.toLocaleString()}
    - Total Monthly Revenue (MRR): $${activeMRR.toLocaleString()}
    - Accounts at High/Critical Churn Risk: ${activeHighRisk.toLocaleString()}
    - Sample Customer Profiles in Active Cohort: ${JSON.stringify(profiles.slice(0, 8))}

    CORE INSTRUCTIONS:
    - Answer the user's question directly, specifically, and conversationally.
    - If the user asks a question, answer that exact question thoroughly. Do NOT repeat the same generic stats introduction every time.
    - If they ask about a specific customer, email draft, retention idea, pricing, or business dilemma, give a complete, professional, and practical response.
    - Format your response with clear Markdown headers, bold highlights, and readable bullet points.`;

    const historyPrompt = (conversationHistory || []).map((h: any) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`).join('\n');
    const fullPrompt = `${businessContext}\n\nConversation History:\n${historyPrompt}\n\nUser Question: ${message}\n\nAssistant Answer:`;

    const response = await generateContentWithModelFallback(ai, {
      contents: fullPrompt
    });

    const reply = response.text || buildChatFallback();
    res.json({ reply });
  } catch (error: any) {
    console.log('[Fallback] Serving intelligent AI Chat response for query:', error?.message || error);
    res.json({ reply: buildChatFallback() });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChurnShield full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
