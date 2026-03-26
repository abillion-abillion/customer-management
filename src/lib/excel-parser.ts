import * as XLSX from "xlsx";
import { getDb } from "./db";

interface ParsedFinancial {
  customer: {
    name: string;
    birth_year: number | null;
    gender: string;
    job: string;
    address: string;
    email: string;
    phone: string;
    financial_goal: string;
    label: string;
  };
  income: {
    salary_self: number;
    salary_spouse: number;
    other_income: number;
    bonus: number;
    total_monthly_income: number;
  };
  expenses: {
    fixed: { category: string; amount: number }[];
    variable: { category: string; amount: number }[];
    total_fixed: number;
    total_variable: number;
    total: number;
  };
  assets: {
    safe: { name: string; amount: number; start_date: string; end_date: string; accumulated: number; return_rate: number }[];
    investment: { name: string; amount: number; start_date: string; end_date: string; accumulated: number; return_rate: number }[];
    total_safe: number;
    total_investment: number;
  };
  real_estate: { usage: string; type: string; ownership: string; amount: number; region: string }[];
  debts: { usage: string; type: string; method: string; period: string; balance: number; rate: number; monthly: number }[];
  insurance: { policyholder: string; insured: string; product: string; premium: number }[];
  summary: {
    net_assets: number;
    total_debt: number;
    savings_capacity: number;
    insurance_premium: number;
    real_estate_total: number;
  };
}

function safeNum(val: unknown): number {
  if (val === null || val === undefined || val === "" || val === "#DIV/0!") return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

export function parseFinancialExcel(filePath: string): ParsedFinancial {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];

  function cell(ref: string): unknown {
    const c = ws[ref];
    return c ? c.v : null;
  }

  // Basic info - row 2 header, rows 5-9 details
  const name = safeStr(cell("D5")) || safeStr(cell("E5")) || safeStr(cell("D6"));
  const birthYear = safeNum(cell("J2"));
  const gender = safeStr(cell("K5")) || safeStr(cell("J5"));
  const job = safeStr(cell("L5")) || safeStr(cell("M5"));
  const address = safeStr(cell("R5")) || safeStr(cell("S5"));
  const email = safeStr(cell("R7")) || safeStr(cell("S7"));
  const phone = safeStr(cell("R8")) || safeStr(cell("S8"));
  const financialGoal = safeStr(cell("D8")) || safeStr(cell("E8"));

  // Income - rows 14-20
  const salaryTotal = safeNum(cell("H14")) || safeNum(cell("J14"));
  const salarySpouse = safeNum(cell("J17"));
  const otherIncome = safeNum(cell("J20")) || safeNum(cell("D20"));
  const bonus = safeNum(cell("I24"));
  const monthlyIncome = safeNum(cell("D24"));

  // Fixed expenses - rows 31-34
  const fixedExpenses: { category: string; amount: number }[] = [];
  const fixedCategories = [
    { row: 31, name: "공과금/관리비" },
    { row: 32, name: "통신비" },
    { row: 33, name: "교통비" },
    { row: 34, name: "대출상환" },
  ];
  for (const fc of fixedCategories) {
    const amt = safeNum(cell(`E${fc.row}`));
    fixedExpenses.push({ category: fc.name, amount: amt });
  }

  // Variable expenses - rows 31-34
  const variableExpenses: { category: string; amount: number }[] = [];
  const varCategories = [
    { row: 31, name: "생활비" },
    { row: 32, name: "구독료" },
    { row: 33, name: "취미생활" },
    { row: 34, name: "보험료" },
  ];
  for (const vc of varCategories) {
    const amt = safeNum(cell(`J${vc.row}`));
    variableExpenses.push({ category: vc.name, amount: amt });
  }

  const totalFixed = safeNum(cell("E39"));
  const totalVariable = safeNum(cell("J39"));
  const totalExpense = safeNum(cell("F40"));

  // Assets - safe assets rows 14-20, investment assets rows 28-34
  const safeAssets: ParsedFinancial["assets"]["safe"] = [];
  for (let r = 14; r <= 22; r++) {
    const productName = safeStr(cell(`N${r}`)) || safeStr(cell(`O${r}`));
    if (productName && !productName.includes("안전자산") && !productName.includes("투자자산")) {
      safeAssets.push({
        name: productName.replace(/\n/g, " "),
        amount: safeNum(cell(`R${r}`)),
        start_date: safeStr(cell(`T${r}`)),
        end_date: safeStr(cell(`W${r}`)),
        accumulated: safeNum(cell(`Z${r}`)),
        return_rate: safeNum(cell(`AB${r}`)),
      });
    }
  }

  const investmentAssets: ParsedFinancial["assets"]["investment"] = [];
  for (let r = 28; r <= 38; r++) {
    const productName = safeStr(cell(`N${r}`)) || safeStr(cell(`O${r}`));
    if (productName && !productName.includes("투자자산")) {
      investmentAssets.push({
        name: productName.replace(/\n/g, " "),
        amount: safeNum(cell(`R${r}`)),
        start_date: safeStr(cell(`T${r}`)),
        end_date: safeStr(cell(`W${r}`)),
        accumulated: safeNum(cell(`Z${r}`)),
        return_rate: safeNum(cell(`AB${r}`)),
      });
    }
  }

  // Real estate - row 5 onwards in AE-AP columns
  const realEstate: ParsedFinancial["real_estate"] = [];
  for (let r = 5; r <= 10; r++) {
    const usage = safeStr(cell(`AE${r}`));
    if (usage) {
      realEstate.push({
        usage,
        type: safeStr(cell(`AI${r}`)),
        ownership: safeStr(cell(`AL${r}`)),
        amount: safeNum(cell(`AN${r}`)),
        region: safeStr(cell(`AP${r}`)),
      });
    }
  }

  // Debts - rows 24-26 area in AE-AP columns
  const debts: ParsedFinancial["debts"] = [];
  for (let r = 13; r <= 22; r++) {
    const usage = safeStr(cell(`AE${r}`));
    if (usage && !usage.includes("용도") && !usage.includes("부") && !usage.includes("(")) {
      debts.push({
        usage,
        type: safeStr(cell(`AG${r}`)),
        method: safeStr(cell(`AI${r}`)),
        period: safeStr(cell(`AK${r}`)),
        balance: safeNum(cell(`AM${r}`)),
        rate: safeNum(cell(`AO${r}`)),
        monthly: safeNum(cell(`AP${r}`)),
      });
    }
  }

  // Insurance - rows 29-42 in AE-AP columns
  const insurance: ParsedFinancial["insurance"] = [];
  for (let r = 29; r <= 42; r++) {
    const policyholder = safeStr(cell(`AE${r}`));
    const product = safeStr(cell(`AI${r}`));
    if ((policyholder || product) && !policyholder.includes("계약자") && !policyholder.includes("보 장") && !policyholder.includes("합계")) {
      insurance.push({
        policyholder,
        insured: safeStr(cell(`AG${r}`)),
        product,
        premium: safeNum(cell(`AP${r}`)),
      });
    }
  }

  const totalDebt = safeNum(cell("AL24"));
  const netAssets = safeNum(cell("AL26"));
  const savingsCapacity = safeNum(cell("F42"));
  const insurancePremium = safeNum(cell("AL42"));

  const label = `${birthYear ? String(birthYear).slice(-2) : "00"}_${gender || "미정"}_${name || "미상"}`;

  return {
    customer: { name, birth_year: birthYear || null, gender, job, address, email, phone, financial_goal: financialGoal, label },
    income: { salary_self: salaryTotal, salary_spouse: salarySpouse, other_income: otherIncome, bonus, total_monthly_income: monthlyIncome },
    expenses: { fixed: fixedExpenses, variable: variableExpenses, total_fixed: totalFixed, total_variable: totalVariable, total: totalExpense },
    assets: { safe: safeAssets, investment: investmentAssets, total_safe: 0, total_investment: 0 },
    real_estate: realEstate,
    debts,
    insurance,
    summary: {
      net_assets: netAssets,
      total_debt: totalDebt,
      savings_capacity: savingsCapacity,
      insurance_premium: insurancePremium,
      real_estate_total: realEstate.reduce((s, r) => s + r.amount, 0),
    },
  };
}

export function saveToDb(parsed: ParsedFinancial, snapshotLabel: string): { customerId: number; snapshotId: number } {
  const db = getDb();

  // Upsert customer
  let customer = db.prepare("SELECT id FROM customers WHERE name = ? AND birth_year = ?").get(parsed.customer.name, parsed.customer.birth_year) as { id: number } | undefined;

  if (!customer) {
    const result = db.prepare(`
      INSERT INTO customers (name, birth_year, gender, job, address, email, phone, financial_goal, label)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parsed.customer.name, parsed.customer.birth_year, parsed.customer.gender,
      parsed.customer.job, parsed.customer.address, parsed.customer.email,
      parsed.customer.phone, parsed.customer.financial_goal, parsed.customer.label
    );
    customer = { id: result.lastInsertRowid as number };
  }

  const totalSafe = parsed.assets.safe.reduce((s, a) => s + a.accumulated, 0);
  const totalInvest = parsed.assets.investment.reduce((s, a) => s + a.accumulated, 0);

  // Create snapshot
  const snap = db.prepare(`
    INSERT INTO snapshots (customer_id, snapshot_date, label,
      salary_self, salary_spouse, other_income, bonus, total_monthly_income,
      expense_fixed, expense_variable, total_expense,
      safe_assets, investment_assets, total_financial_assets,
      real_estate_total, total_debt, monthly_debt_payment,
      insurance_premium, net_assets, savings_capacity, savings_ratio, investment_ratio)
    VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
  `).run(
    customer.id, snapshotLabel,
    parsed.income.salary_self, parsed.income.salary_spouse, parsed.income.other_income, parsed.income.bonus, parsed.income.total_monthly_income,
    parsed.expenses.total_fixed, parsed.expenses.total_variable, parsed.expenses.total,
    totalSafe, totalInvest, totalSafe + totalInvest,
    parsed.summary.real_estate_total, parsed.summary.total_debt, 0,
    parsed.summary.insurance_premium, parsed.summary.net_assets, parsed.summary.savings_capacity
  );
  const snapshotId = snap.lastInsertRowid as number;

  // Save details
  const insertAsset = db.prepare("INSERT INTO assets (snapshot_id, asset_type, product_name, deposit_amount, start_date, end_date, accumulated, return_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  for (const a of parsed.assets.safe) {
    insertAsset.run(snapshotId, "safe", a.name, a.amount, a.start_date, a.end_date, a.accumulated, a.return_rate);
  }
  for (const a of parsed.assets.investment) {
    insertAsset.run(snapshotId, "investment", a.name, a.amount, a.start_date, a.end_date, a.accumulated, a.return_rate);
  }

  const insertExpense = db.prepare("INSERT INTO expense_details (snapshot_id, category, type, amount) VALUES (?, ?, ?, ?)");
  for (const e of parsed.expenses.fixed) insertExpense.run(snapshotId, e.category, "fixed", e.amount);
  for (const e of parsed.expenses.variable) insertExpense.run(snapshotId, e.category, "variable", e.amount);

  const insertRE = db.prepare("INSERT INTO real_estate (snapshot_id, usage, property_type, ownership, amount, region) VALUES (?, ?, ?, ?, ?, ?)");
  for (const r of parsed.real_estate) insertRE.run(snapshotId, r.usage, r.type, r.ownership, r.amount, r.region);

  const insertDebt = db.prepare("INSERT INTO debts (snapshot_id, usage, debt_type, repayment_method, period, total_balance, interest_rate, monthly_payment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  for (const d of parsed.debts) insertDebt.run(snapshotId, d.usage, d.type, d.method, d.period, d.balance, d.rate, d.monthly);

  const insertIns = db.prepare("INSERT INTO insurance (snapshot_id, policyholder, insured, product_name, premium) VALUES (?, ?, ?, ?, ?)");
  for (const i of parsed.insurance) insertIns.run(snapshotId, i.policyholder, i.insured, i.product, i.premium);

  // Create user account if not exists
  const existing = db.prepare("SELECT id FROM users WHERE customer_id = ?").get(customer.id);
  if (!existing) {
    const bcrypt = require("bcryptjs");
    const username = parsed.customer.label || `customer_${customer.id}`;
    const hash = bcrypt.hashSync("1234", 10);
    db.prepare("INSERT INTO users (username, password, role, customer_id) VALUES (?, ?, 'customer', ?)").run(username, hash, customer.id);
  }

  return { customerId: customer.id, snapshotId };
}
