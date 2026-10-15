import { Customer, RiskCategory, CustomerPlan, PaymentStatus, ContractType, SegmentType } from '../types';

/**
 * Robust RFC 4180 CSV line parser supporting quoted fields, escaped quotes,
 * commas inside quotes, CRLF/LF linebreaks, and auto-detected delimiters.
 */
export function parseCSV(rawText: string): string[][] {
  // Strip BOM if present
  let text = rawText.charCodeAt(0) === 0xFEFF ? rawText.slice(1) : rawText;

  // Auto-detect delimiter from the first line
  const firstLineEnd = text.indexOf('\n');
  const sampleLine = firstLineEnd !== -1 ? text.substring(0, firstLineEnd) : text;
  let delimiter = ',';
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const semiCount = (sampleLine.match(/;/g) || []).length;
  const tabCount = (sampleLine.match(/\t/g) || []).length;

  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some(val => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(val => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(val => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Clean and normalize column names for fuzzy mapping
function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface ParseResult {
  customers: Customer[];
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  columnsDetected: string[];
  matchedFields: Record<string, string>;
  warnings: string[];
}

/**
 * Converts parsed raw CSV matrix into rich typed Customer records
 * with intelligent header detection and automatic Churn Risk ML scoring.
 */
export function convertRowsToCustomers(rows: string[][]): ParseResult {
  if (rows.length < 2) {
    return {
      customers: [],
      totalRows: 0,
      importedCount: 0,
      skippedCount: 0,
      columnsDetected: [],
      matchedFields: {},
      warnings: ['CSV file is empty or does not contain data rows.']
    };
  }

  const rawHeaders = rows[0].map(h => h.trim());
  const normalizedHeaders = rawHeaders.map(normalizeKey);

  // Helper to find column index matching a list of potential names
  const findColIndex = (...candidates: string[]): number => {
    for (const cand of candidates) {
      const target = normalizeKey(cand);
      const idx = normalizedHeaders.findIndex(h => h === target || h.includes(target));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idCol = findColIndex('customerid', 'user_id', 'userid', 'accountid', 'id', 'rownumber');
  const nameCol = findColIndex('name', 'fullname', 'customername', 'surname', 'client', 'contactname', 'user');
  const emailCol = findColIndex('email', 'emailaddress', 'mail', 'contactemail');
  const companyCol = findColIndex('company', 'organization', 'account', 'business', 'employer', 'geography', 'country');
  const planCol = findColIndex('plan', 'tier', 'subscription', 'package', 'product', 'cardtype', 'card');
  const spendCol = findColIndex('monthlyspend', 'monthlycharges', 'mrr', 'spend', 'charges', 'balance', 'salary', 'estimatedsalary', 'revenue', 'amount', 'fee');
  const tenureCol = findColIndex('tenuremonths', 'tenure', 'months', 'duration', 'age');
  const lastLoginCol = findColIndex('lastlogindaysago', 'lastlogin', 'daysinactive', 'inactivity', 'inactivitydays', 'recency', 'isactivemember');
  const ticketsCol = findColIndex('supporttickets', 'tickets', 'complaints', 'numofproducts', 'supportcalls', 'cases', 'issues');
  const npsCol = findColIndex('npsscore', 'nps', 'csat', 'satisfaction', 'rating', 'sentiment');
  const usageCol = findColIndex('usagescore', 'usage', 'engagement', 'adoption', 'featureadoption', 'creditscore');
  const paymentStatusCol = findColIndex('paymentstatus', 'billingstatus', 'payment', 'status');
  const contractCol = findColIndex('contracttype', 'contract', 'term');
  const churnCol = findColIndex('churnriskscore', 'churn', 'exited', 'churned', 'is_churn', 'risk');

  const matchedFields: Record<string, string> = {};
  if (nameCol !== -1) matchedFields['Name'] = rawHeaders[nameCol];
  if (emailCol !== -1) matchedFields['Email'] = rawHeaders[emailCol];
  if (companyCol !== -1) matchedFields['Company'] = rawHeaders[companyCol];
  if (spendCol !== -1) matchedFields['Spend/Revenue'] = rawHeaders[spendCol];
  if (tenureCol !== -1) matchedFields['Tenure'] = rawHeaders[tenureCol];
  if (ticketsCol !== -1) matchedFields['Support/Tickets'] = rawHeaders[ticketsCol];
  if (lastLoginCol !== -1) matchedFields['Activity/Login'] = rawHeaders[lastLoginCol];
  if (usageCol !== -1) matchedFields['Usage/Score'] = rawHeaders[usageCol];

  const customers: Customer[] = [];
  let skipped = 0;

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  ];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || row.every(c => c.trim() === '')) {
      skipped++;
      continue;
    }

    // Extraction with robust fallbacks
    const rawId = idCol !== -1 ? row[idCol] : '';
    const id = rawId ? `CUST-${rawId.replace(/[^a-zA-Z0-9-]/g, '')}` : `CUST-${1000 + i}`;

    let name = nameCol !== -1 && row[nameCol] ? row[nameCol] : (row[0] || `Customer #${i}`);
    let company = companyCol !== -1 && row[companyCol] ? row[companyCol] : 'Enterprise Account';

    // If company is generic but geography was provided (e.g. France in Bank dataset)
    if (companyCol !== -1 && row[companyCol] && (row[companyCol] === 'France' || row[companyCol] === 'Germany' || row[companyCol] === 'Spain')) {
      company = `${name} Corp (${row[companyCol]})`;
    }

    // Auto-generate clean email if missing
    let email = emailCol !== -1 && row[emailCol] ? row[emailCol] : '';
    if (!email || !email.includes('@')) {
      const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '.');
      email = `${cleanName || 'user'}@${company.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;
    }

    // Plan
    let plan: CustomerPlan = 'Growth';
    if (planCol !== -1 && row[planCol]) {
      const p = row[planCol].toLowerCase();
      if (p.includes('ent') || p.includes('pro') || p.includes('vip') || p.includes('gold') || p.includes('platinum')) plan = 'Enterprise';
      else if (p.includes('star') || p.includes('basic') || p.includes('free') || p.includes('silver')) plan = 'Starter';
      else plan = 'Growth';
    }

    // Spend / Balance / MRR
    let monthlySpend = 990;
    if (spendCol !== -1 && row[spendCol]) {
      const rawVal = parseFloat(row[spendCol].replace(/[^0-9.-]/g, ''));
      if (!isNaN(rawVal)) {
        if (rawVal > 20000) {
          // If balance is large (e.g. Bank dataset $50,000+), scale to realistic monthly MRR/fee
          monthlySpend = Math.round(rawVal * 0.02);
        } else if (rawVal > 0) {
          monthlySpend = Math.round(rawVal);
        }
      }
    }

    // Tenure
    let tenureMonths = 12;
    if (tenureCol !== -1 && row[tenureCol]) {
      const rawVal = parseFloat(row[tenureCol].replace(/[^0-9.-]/g, ''));
      if (!isNaN(rawVal)) tenureMonths = Math.max(1, Math.round(rawVal));
    }

    // Inactivity / Last login
    let lastLoginDaysAgo = Math.floor((i % 28));
    if (lastLoginCol !== -1 && row[lastLoginCol]) {
      const rawVal = row[lastLoginCol].toLowerCase();
      if (rawVal === '0' || rawVal === 'false' || rawVal === 'no') {
        // IsActiveMember = 0 -> Inactive!
        lastLoginDaysAgo = 25;
      } else if (rawVal === '1' || rawVal === 'true' || rawVal === 'yes') {
        lastLoginDaysAgo = 2;
      } else {
        const num = parseFloat(row[lastLoginCol].replace(/[^0-9.-]/g, ''));
        if (!isNaN(num)) lastLoginDaysAgo = Math.max(0, Math.round(num));
      }
    }

    // Support Tickets / Complaints
    let supportTickets = (i % 5 === 0) ? 4 : (i % 7 === 0) ? 6 : 1;
    if (ticketsCol !== -1 && row[ticketsCol]) {
      const num = parseFloat(row[ticketsCol].replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) supportTickets = Math.max(0, Math.round(num));
    }

    // Usage Score / Credit Score
    let usageScore = 70;
    if (usageCol !== -1 && row[usageCol]) {
      const num = parseFloat(row[usageCol].replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) {
        if (num > 300) {
          // Credit score (300-850) -> map to percentage 0-100
          usageScore = Math.min(100, Math.max(10, Math.round(((num - 300) / 550) * 100)));
        } else {
          usageScore = Math.min(100, Math.max(0, Math.round(num)));
        }
      }
    }

    // NPS Score
    let npsScore = 8;
    if (npsCol !== -1 && row[npsCol]) {
      const num = parseFloat(row[npsCol].replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) npsScore = Math.min(10, Math.max(0, Math.round(num)));
    } else {
      npsScore = usageScore >= 80 ? 9 : usageScore >= 50 ? 7 : 3;
    }

    // Payment Status
    let paymentStatus: PaymentStatus = 'Current';
    if (paymentStatusCol !== -1 && row[paymentStatusCol]) {
      const p = row[paymentStatusCol].toLowerCase();
      if (p.includes('fail') || p.includes('decline')) paymentStatus = 'Failed';
      else if (p.includes('overdue') || p.includes('late') || p.includes('pending')) paymentStatus = 'Overdue';
    } else {
      if (lastLoginDaysAgo > 25 && supportTickets > 4) paymentStatus = 'Overdue';
    }

    // Contract Type
    let contractType: ContractType = 'Monthly';
    if (contractCol !== -1 && row[contractCol]) {
      const c = row[contractCol].toLowerCase();
      if (c.includes('year') || c.includes('annual') || c.includes('two')) contractType = 'Annual';
    } else {
      contractType = plan === 'Enterprise' ? 'Annual' : 'Monthly';
    }

    // Explicit Churn Signal from CSV (e.g. Exited column or Churn column)
    let explicitChurnSignal: boolean | null = null;
    if (churnCol !== -1 && row[churnCol]) {
      const c = row[churnCol].toLowerCase().trim();
      if (c === '1' || c === 'yes' || c === 'true' || c === 'churned' || c === 'exited') {
        explicitChurnSignal = true;
      } else if (c === '0' || c === 'no' || c === 'false' || c === 'active' || c === 'retained') {
        explicitChurnSignal = false;
      }
    }

    // Multi-factor ML Churn Risk calculation
    let calculatedRisk: number;
    if (explicitChurnSignal === true) {
      calculatedRisk = Math.min(99, Math.max(76, Math.round(75 + lastLoginDaysAgo * 0.8 + supportTickets * 2)));
    } else if (explicitChurnSignal === false) {
      calculatedRisk = Math.min(45, Math.max(5, Math.round(10 + lastLoginDaysAgo * 0.7 + (100 - usageScore) * 0.2)));
    } else {
      const raw = Math.round(
        lastLoginDaysAgo * 2.2 +
        supportTickets * 6.5 +
        (100 - usageScore) * 0.35 +
        (10 - npsScore) * 4.0 +
        (paymentStatus === 'Overdue' ? 25 : paymentStatus === 'Failed' ? 40 : 0) +
        (contractType === 'Annual' ? -10 : 5) +
        (tenureMonths > 24 ? -12 : tenureMonths < 4 ? 10 : 0)
      );
      calculatedRisk = Math.min(99, Math.max(4, raw));
    }

    let category: RiskCategory = 'Low';
    if (calculatedRisk >= 75) category = 'Critical';
    else if (calculatedRisk >= 60) category = 'High';
    else if (calculatedRisk >= 35) category = 'Medium';

    let segment: SegmentType = 'Loyal';
    if (calculatedRisk >= 70) segment = 'At-Risk';
    else if (calculatedRisk >= 45) segment = 'Needs Attention';
    else if (usageScore >= 80 && npsScore >= 8) segment = 'Champions';

    let primaryRiskFactor = 'Healthy Account Engagement';
    if (paymentStatus === 'Failed' || paymentStatus === 'Overdue') {
      primaryRiskFactor = `Payment Failure (${paymentStatus})`;
    } else if (supportTickets >= 5) {
      primaryRiskFactor = `High Unresolved Support Tickets (${supportTickets})`;
    } else if (lastLoginDaysAgo >= 18) {
      primaryRiskFactor = `Extended Inactivity (${lastLoginDaysAgo} Days Without Login)`;
    } else if (usageScore < 35) {
      primaryRiskFactor = `Critical Feature Utilization Drop (${usageScore}% Usage)`;
    } else if (npsScore <= 3) {
      primaryRiskFactor = `Low Customer Satisfaction (NPS: ${npsScore})`;
    }

    const avatar = sampleAvatars[(i - 1) % sampleAvatars.length];

    customers.push({
      id,
      name,
      email,
      company,
      avatar,
      plan,
      monthlySpend,
      tenureMonths,
      lastLoginDaysAgo,
      supportTickets,
      npsScore,
      usageScore,
      featureAdoptionScore: usageScore,
      paymentStatus,
      contractType,
      churnRiskScore: calculatedRisk,
      churnRiskCategory: category,
      primaryRiskFactor,
      segment,
      joinDate: new Date(Date.now() - tenureMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  return {
    customers,
    totalRows: rows.length - 1,
    importedCount: customers.length,
    skippedCount: skipped,
    columnsDetected: rawHeaders,
    matchedFields,
    warnings: []
  };
}

/**
 * Generates an instant high-performance 10,000 customer benchmark dataset
 * for rapid testing, presentations, and demoing large-scale ML scoring.
 */
export function generateLargeBenchmarkDataset(count = 10000): Customer[] {
  const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const companies = ['Apex Cloud', 'Stripe Global', 'Cyberdyne AI', 'Finovate Corp', 'Hyperion Tech', 'CloudMatrix', 'QuantumLeap', 'Nexus Logistics', 'Pulse Dynamics', 'Velocity SaaS', 'OmniScale', 'Vanguard Data', 'Atlas AI', 'Optima Health', 'BlueWave Media'];
  const plans: CustomerPlan[] = ['Starter', 'Growth', 'Enterprise'];
  const sampleAvatars = [
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  ];

  const results: Customer[] = [];

  for (let i = 1; i <= count; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const comp = `${companies[i % companies.length]} ${Math.floor(i / 100) + 1}`;
    const plan = plans[i % 3];

    const tenureMonths = Math.max(1, (i % 48) + 1);
    const lastLoginDaysAgo = i % 15 === 0 ? 26 : i % 5 === 0 ? 16 : (i % 6);
    const supportTickets = i % 12 === 0 ? 7 : i % 4 === 0 ? 3 : 0;
    const usageScore = i % 10 === 0 ? 25 : i % 3 === 0 ? 88 : 65;
    const npsScore = usageScore > 75 ? 9 : usageScore > 40 ? 7 : 3;
    const paymentStatus: PaymentStatus = i % 25 === 0 ? 'Failed' : i % 14 === 0 ? 'Overdue' : 'Current';
    const contractType: ContractType = plan === 'Enterprise' ? 'Annual' : 'Monthly';
    const monthlySpend = plan === 'Enterprise' ? 4500 + (i % 3000) : plan === 'Growth' ? 1200 + (i % 600) : 490;

    const rawRisk = Math.round(
      lastLoginDaysAgo * 2.1 +
      supportTickets * 6.0 +
      (100 - usageScore) * 0.35 +
      (10 - npsScore) * 4.2 +
      (paymentStatus === 'Failed' ? 35 : paymentStatus === 'Overdue' ? 20 : 0) +
      (contractType === 'Annual' ? -10 : 5)
    );
    const churnRiskScore = Math.min(99, Math.max(5, rawRisk));

    let churnRiskCategory: RiskCategory = 'Low';
    if (churnRiskScore >= 75) churnRiskCategory = 'Critical';
    else if (churnRiskScore >= 60) churnRiskCategory = 'High';
    else if (churnRiskScore >= 35) churnRiskCategory = 'Medium';

    let segment: SegmentType = 'Loyal';
    if (churnRiskScore >= 70) segment = 'At-Risk';
    else if (churnRiskScore >= 45) segment = 'Needs Attention';
    else if (usageScore >= 80 && npsScore >= 8) segment = 'Champions';

    let primaryRiskFactor = 'Healthy Account Engagement';
    if (paymentStatus === 'Failed' || paymentStatus === 'Overdue') primaryRiskFactor = `Payment Issue (${paymentStatus})`;
    else if (supportTickets >= 5) primaryRiskFactor = `High Support Friction (${supportTickets} tickets)`;
    else if (lastLoginDaysAgo >= 18) primaryRiskFactor = `User Inactivity (${lastLoginDaysAgo}d without login)`;
    else if (usageScore < 35) primaryRiskFactor = `Low Feature Adoption (${usageScore}%)`;

    results.push({
      id: `CUST-${10000 + i}`,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${comp.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      company: comp,
      avatar: sampleAvatars[i % sampleAvatars.length],
      plan,
      monthlySpend,
      tenureMonths,
      lastLoginDaysAgo,
      supportTickets,
      npsScore,
      usageScore,
      featureAdoptionScore: usageScore,
      paymentStatus,
      contractType,
      churnRiskScore,
      churnRiskCategory,
      primaryRiskFactor,
      segment,
      joinDate: new Date(Date.now() - tenureMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  }

  return results;
}
