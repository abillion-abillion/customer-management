import * as XLSX from "xlsx";
import { getDb } from "./db";

type ExpenseItem = { category: string; amount: number };
type AssetItem = {
  name: string;
  amount: number;
  start_date: string;
  end_date: string;
  accumulated: number;
  return_rate: number;
};

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
    fixed: ExpenseItem[];
    variable: ExpenseItem[];
    total_fixed: number;
    total_variable: number;
    total: number;
  };
  assets: {
    safe: AssetItem[];
    investment: AssetItem[];
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
    total_assets: number;
    overall_return_rate: number;
    monthly_debt_payment: number;
  };
}

const HEADER_KEYWORDS = [
  "구분",
  "용도",
  "종류",
  "상환법",
  "기간",
  "대출총액",
  "월상환액",
  "상품명",
  "계약자",
  "피보험자",
  "보험료",
  "합계",
  "총",
  "순자산",
  "부채",
  "지출액",
  "시, 구, 동",
  "SKT / KT / LG",
  "월평성과",
  "재무목표",
  "연락처",
  "E-mail",
  "성명",
  "성별",
  "직업",
  "생년월일",
];

function safeNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;

  const text = String(val).replace(/,/g, "").replace(/\s/g, "").replace(/%/g, "");
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).replace(/\r?\n/g, " ").trim();
}

function normalizeRate(val: unknown): number {
  const n = safeNum(val);
  if (n > 0 && n < 1) return Math.round(n * 10000) / 100;
  return n;
}

function looksLikeHeader(text: string): boolean {
  if (!text) return false;
  return HEADER_KEYWORDS.some((keyword) => text.includes(keyword));
}

function normalizeGender(raw: string): string {
  if (!raw) return "";
  if (raw.includes("남")) return "남";
  if (raw.includes("여")) return "여";
  return raw.replace(/\s/g, "");
}

function normalizeLabelGender(raw: string): string {
  if (raw.includes("남")) return "남";
  if (raw.includes("여")) return "여";
  return "미정";
}

function normalizeBirthYear(raw: unknown): number | null {
  if (typeof raw === "string") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 6) {
      const first4 = Number(digits.slice(0, 4));
      if (first4 >= 1900 && first4 <= new Date().getFullYear()) return first4;
      const yy = Number(digits.slice(0, 2));
      if (!Number.isNaN(yy)) {
        const currentYear = new Date().getFullYear();
        const century = yy <= currentYear % 100 ? 2000 : 1900;
        return century + yy;
      }
    }
    if (digits.length === 5) {
      const yy = Number(digits.slice(0, 2));
      if (!Number.isNaN(yy)) {
        const currentYear = new Date().getFullYear();
        const century = yy <= currentYear % 100 ? 2000 : 1900;
        return century + yy;
      }
    }
    if (digits.length >= 4) {
      const year = Number(digits.slice(0, 4));
      const currentYear = new Date().getFullYear();
      if (year >= 1900 && year <= currentYear) return year;
    }
    if (digits.length === 2) {
      raw = Number(digits);
    }
  }

  const n = safeNum(raw);
  if (!n) return null;
  const currentYear = new Date().getFullYear();
  const nDigits = String(Math.trunc(Math.abs(n)));
  if (nDigits.length >= 6) {
    const first4 = Number(nDigits.slice(0, 4));
    if (first4 >= 1900 && first4 <= currentYear) return first4;
    const yy = Number(nDigits.slice(0, 2));
    const century = yy <= currentYear % 100 ? 2000 : 1900;
    return century + yy;
  }
  if (nDigits.length === 5) {
    const yy = Number(nDigits.slice(0, 2));
    const century = yy <= currentYear % 100 ? 2000 : 1900;
    return century + yy;
  }

  if (n >= 30000 && n <= 60000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + n * 86400000);
    const year = date.getUTCFullYear();
    if (year >= 1900 && year <= currentYear) return year;
  }
  if (n >= 1900 && n <= currentYear) return Math.round(n);

  if (n >= 0 && n < 100) {
    const twoDigits = Math.round(n);
    const century = twoDigits <= currentYear % 100 ? 2000 : 1900;
    return century + twoDigits;
  }

  return Math.round(n);
}

function assetValue(asset: AssetItem): number {
  return asset.accumulated > 0 ? asset.accumulated : asset.amount;
}

function formatUploadMonth(date: Date): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "00";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  return `${year.padStart(2, "0")}.${month.padStart(2, "0")}`;
}

function parseSqliteDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const asUtc = new Date(`${normalized}Z`);
  if (!Number.isNaN(asUtc.getTime())) return asUtc;
  const asLocal = new Date(normalized);
  return Number.isNaN(asLocal.getTime()) ? null : asLocal;
}

function extractFirstUploadMonthFromLabel(label: string | null | undefined): string | null {
  if (!label) return null;
  const match = label.match(/_(\d{2}\.\d{2})$/);
  return match ? match[1] : null;
}

function buildCustomerLabel(birthYear: number | null, gender: string, name: string, firstUploadMonth: string): string {
  const birthLabel = birthYear ? String(birthYear).slice(-2).padStart(2, "0") : "00";
  const genderLabel = normalizeLabelGender(gender);
  const normalizedName = (name || "미상").replace(/\s+/g, "");
  return `${birthLabel}_${genderLabel}_${normalizedName}_${firstUploadMonth}`;
}

function getInitialPasswordFromPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  return "0000";
}

function extractPhone(raw: string): string {
  const text = raw || "";
  const match = text.match(/01[016789][ -]?\d{3,4}[ -]?\d{4}/);
  const candidate = match ? match[0] : text;
  const digits = candidate.replace(/\D/g, "");
  if (!digits) return "";
  if (/^0100{7,8}$/.test(digits)) return "";
  return digits;
}

function selectFinancialSheet(wb: XLSX.WorkBook): XLSX.WorkSheet {
  const names = wb.SheetNames;

  const exactGd = names.find((name) => name.trim().toUpperCase() === "GD");
  if (exactGd) return wb.Sheets[exactGd];

  const gdAfter = names.find((name) => /^GD/i.test(name) && name.includes("후"));
  if (gdAfter) return wb.Sheets[gdAfter];

  const gdAny = names.find((name) => /^GD/i.test(name));
  if (gdAny) return wb.Sheets[gdAny];

  let bestName = names[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const name of names) {
    const ws = wb.Sheets[name];
    let score = 0;

    if (/^PC$/i.test(name)) score += 300;
    if (/^FS/i.test(name)) score += 200;
    if (/상담일지|포트폴리오|지표|인쇄|SWOT|청약|금융계획|사업자|FP/i.test(name)) score -= 400;

    const d6 = safeStr(ws["D6"]?.v);
    const h6 = ws["H6"]?.v ?? ws["I6"]?.v;
    const j6 = safeStr(ws["J6"]?.v ?? ws["K6"]?.v);
    const d24 = safeNum(ws["D24"]?.v);
    const j14 = safeNum(ws["J14"]?.v);
    const j17 = safeNum(ws["J17"]?.v);
    const f40 = safeNum(ws["F40"]?.v);

    if (d6 && !looksLikeHeader(d6)) score += 120;
    if (normalizeBirthYear(h6)) score += 80;
    if (normalizeGender(j6)) score += 50;
    if (d24 > 0) score += 120;
    if (j14 > 0) score += 40;
    if (j17 > 0) score += 40;
    if (f40 > 0) score += 30;

    if (score > bestScore) {
      bestScore = score;
      bestName = name;
    }
  }

  return wb.Sheets[bestName];
}

export function parseFinancialExcel(filePath: string): ParsedFinancial {
  const wb = XLSX.readFile(filePath);
  const ws = selectFinancialSheet(wb);

  function cell(ref: string): unknown {
    const c = ws[ref];
    return c ? c.v : null;
  }

  const nameCandidate = safeStr(cell("D6")) || safeStr(cell("E6")) || safeStr(cell("D5"));
  const name = looksLikeHeader(nameCandidate.replace(/\s/g, "")) ? "미상" : nameCandidate || "미상";
  const birthYear = normalizeBirthYear(cell("H6")) ?? normalizeBirthYear(cell("I6"));
  const gender = normalizeGender(safeStr(cell("J6")) || safeStr(cell("K6")) || safeStr(cell("J5")));
  const job = safeStr(cell("L6")) || safeStr(cell("M6")) || safeStr(cell("L5"));

  const addressCandidate = safeStr(cell("R5")) || safeStr(cell("R6")) || safeStr(cell("S5"));
  const address = looksLikeHeader(addressCandidate) ? "" : addressCandidate;

  const emailCandidate = safeStr(cell("R7")) || safeStr(cell("S7"));
  const email = looksLikeHeader(emailCandidate) ? "" : emailCandidate;

  const phoneCandidate = safeStr(cell("R8")) || safeStr(cell("S8"));
  const phone = extractPhone(phoneCandidate);

  const financialGoalCandidate = safeStr(cell("D8")) || safeStr(cell("E8"));
  const financialGoal = looksLikeHeader(financialGoalCandidate.replace(/\s/g, "")) ? "" : financialGoalCandidate;

  const salarySelf = safeNum(cell("J14")) || safeNum(cell("H14"));
  const salarySpouse = safeNum(cell("J17"));
  const otherIncome = safeNum(cell("J19")) || safeNum(cell("J20"));
  const bonus = safeNum(cell("I24"));
  const monthlyIncome = safeNum(cell("D24"));

  const fixedDefaults = ["공과금/관리비", "통신비", "교통비", "대출상환"];
  const fixedExpenses: ExpenseItem[] = [];
  for (let i = 0; i < 4; i++) {
    const row = 31 + i;
    const category = safeStr(cell(`B${row}`)).replace(/\s/g, "") || fixedDefaults[i];
    const amount = safeNum(cell(`E${row}`));
    fixedExpenses.push({ category, amount });
  }

  const variableDefaults = ["생활비", "구독료", "취미생활", "보험료"];
  const variableExpenses: ExpenseItem[] = [];
  for (let i = 0; i < 4; i++) {
    const row = 31 + i;
    const category = safeStr(cell(`G${row}`)).replace(/\s/g, "") || variableDefaults[i];
    const amount = safeNum(cell(`J${row}`));
    variableExpenses.push({ category, amount });
  }

  const totalFixed = safeNum(cell("E39")) || fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalVariable = safeNum(cell("J39")) || variableExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpense = safeNum(cell("F40")) || totalFixed + totalVariable;

  const safeAssets: AssetItem[] = [];
  for (let row = 14; row <= 23; row++) {
    const nameCell = safeStr(cell(`N${row}`));
    const amount = safeNum(cell(`R${row}`));
    const accumulated = safeNum(cell(`Z${row}`));
    const returnRate = normalizeRate(cell(`AB${row}`));

    if (!nameCell || looksLikeHeader(nameCell)) continue;
    if (nameCell.includes("예시") && amount === 0 && accumulated === 0 && returnRate === 0) continue;

    safeAssets.push({
      name: nameCell,
      amount,
      start_date: safeStr(cell(`T${row}`)),
      end_date: safeStr(cell(`W${row}`)),
      accumulated,
      return_rate: returnRate,
    });
  }

  const investmentAssets: AssetItem[] = [];
  for (let row = 28; row <= 39; row++) {
    const nameCell = safeStr(cell(`N${row}`));
    const amount = safeNum(cell(`R${row}`));
    const accumulated = safeNum(cell(`Z${row}`));
    const returnRate = normalizeRate(cell(`AB${row}`));

    if (!nameCell || looksLikeHeader(nameCell)) continue;
    if (nameCell.includes("예시") && amount === 0 && accumulated === 0 && returnRate === 0) continue;

    investmentAssets.push({
      name: nameCell,
      amount,
      start_date: safeStr(cell(`T${row}`)),
      end_date: safeStr(cell(`W${row}`)),
      accumulated,
      return_rate: returnRate,
    });
  }

  const realEstate: ParsedFinancial["real_estate"] = [];
  for (let row = 6; row <= 10; row++) {
    const usage = safeStr(cell(`AE${row}`)).replace(/\s/g, "");
    const amount = safeNum(cell(`AN${row}`));

    if (!usage && amount === 0) continue;
    if (looksLikeHeader(usage)) continue;

    realEstate.push({
      usage,
      type: safeStr(cell(`AI${row}`)).replace(/\s/g, ""),
      ownership: safeStr(cell(`AL${row}`)).replace(/\s/g, ""),
      amount,
      region: safeStr(cell(`AP${row}`)).replace(/\s/g, ""),
    });
  }

  const debts: ParsedFinancial["debts"] = [];
  for (let row = 14; row <= 22; row++) {
    const usage = safeStr(cell(`AE${row}`)).replace(/\s/g, "");
    const balance = safeNum(cell(`AM${row}`));
    const monthly = safeNum(cell(`AP${row}`));

    if (!usage && balance === 0 && monthly === 0) continue;
    if (looksLikeHeader(usage) || usage.includes("총합계") || usage.includes("부채합계")) continue;

    debts.push({
      usage,
      type: safeStr(cell(`AG${row}`)).replace(/\s/g, ""),
      method: safeStr(cell(`AI${row}`)).replace(/\s/g, ""),
      period: safeStr(cell(`AK${row}`)).replace(/\s/g, ""),
      balance,
      rate: normalizeRate(cell(`AO${row}`)),
      monthly,
    });
  }

  const insurance: ParsedFinancial["insurance"] = [];
  for (let row = 31; row <= 41; row++) {
    const policyholder = safeStr(cell(`AE${row}`)).replace(/\s/g, "");
    const insured = safeStr(cell(`AG${row}`)).replace(/\s/g, "");
    const product = safeStr(cell(`AI${row}`));
    const premium = safeNum(cell(`AP${row}`));

    if (!policyholder && !insured && !product && premium === 0) continue;
    if (looksLikeHeader(policyholder) || policyholder.includes("합계보험료")) continue;

    insurance.push({ policyholder, insured, product, premium });
  }

  const totalSafe = safeAssets.reduce((sum, asset) => sum + assetValue(asset), 0);
  const totalInvestment = investmentAssets.reduce((sum, asset) => sum + assetValue(asset), 0);
  const realEstateTotal = realEstate.reduce((sum, estate) => sum + estate.amount, 0);
  const totalFinancialAssets = totalSafe + totalInvestment;
  const totalAssets = totalFinancialAssets + realEstateTotal;

  const weightedReturnBase = [...safeAssets, ...investmentAssets].reduce((sum, asset) => sum + assetValue(asset), 0);
  const weightedReturnNumerator = [...safeAssets, ...investmentAssets].reduce(
    (sum, asset) => sum + assetValue(asset) * (asset.return_rate || 0),
    0,
  );
  const overallReturnRate = weightedReturnBase > 0 ? weightedReturnNumerator / weightedReturnBase : 0;

  const totalDebt = safeNum(cell("AL24")) || debts.reduce((sum, debt) => sum + debt.balance, 0);
  const netAssets = safeNum(cell("AL26")) || totalAssets - totalDebt;
  const savingsCapacity = safeNum(cell("F42")) || monthlyIncome - totalExpense;
  const insurancePremium = safeNum(cell("AL42")) || insurance.reduce((sum, item) => sum + item.premium, 0);
  const monthlyDebtPayment = debts.reduce((sum, debt) => sum + debt.monthly, 0);

  const birthLabel = birthYear ? String(birthYear).slice(-2) : "00";
  const genderLabel = gender || "미정";
  const label = `${birthLabel}_${genderLabel}_${name}`;

  return {
    customer: {
      name,
      birth_year: birthYear,
      gender,
      job,
      address,
      email,
      phone,
      financial_goal: financialGoal,
      label,
    },
    income: {
      salary_self: salarySelf,
      salary_spouse: salarySpouse,
      other_income: otherIncome,
      bonus,
      total_monthly_income: monthlyIncome,
    },
    expenses: {
      fixed: fixedExpenses,
      variable: variableExpenses,
      total_fixed: totalFixed,
      total_variable: totalVariable,
      total: totalExpense,
    },
    assets: {
      safe: safeAssets,
      investment: investmentAssets,
      total_safe: totalSafe,
      total_investment: totalInvestment,
    },
    real_estate: realEstate,
    debts,
    insurance,
    summary: {
      net_assets: netAssets,
      total_debt: totalDebt,
      savings_capacity: savingsCapacity,
      insurance_premium: insurancePremium,
      real_estate_total: realEstateTotal,
      total_assets: totalAssets,
      overall_return_rate: Math.round(overallReturnRate * 100) / 100,
      monthly_debt_payment: monthlyDebtPayment,
    },
  };
}

export function saveToDb(
  parsed: ParsedFinancial,
  snapshotLabel: string,
): { customerId: number; snapshotId: number; customerLabel: string } {
  const db = getDb();

  const normalizedName = parsed.customer.name || "미상";
  let customer = db
    .prepare("SELECT id, label, created_at FROM customers WHERE name = ? AND IFNULL(birth_year, -1) = IFNULL(?, -1)")
    .get(normalizedName, parsed.customer.birth_year) as
    | { id: number; label: string | null; created_at: string | null }
    | undefined;

  const firstUploadMonth =
    extractFirstUploadMonthFromLabel(customer?.label) ||
    formatUploadMonth(parseSqliteDate(customer?.created_at) || new Date());
  const customerLabel = buildCustomerLabel(parsed.customer.birth_year, parsed.customer.gender, normalizedName, firstUploadMonth);
  parsed.customer.label = customerLabel;

  if (!customer) {
    const result = db
      .prepare(`
        INSERT INTO customers (name, birth_year, gender, job, address, email, phone, financial_goal, label)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        normalizedName,
        parsed.customer.birth_year,
        parsed.customer.gender,
        parsed.customer.job,
        parsed.customer.address,
        parsed.customer.email,
        parsed.customer.phone,
        parsed.customer.financial_goal,
        customerLabel,
      );
    customer = { id: Number(result.lastInsertRowid), label: customerLabel, created_at: null };
  } else {
    db.prepare(`
      UPDATE customers
      SET gender = ?, job = ?, address = ?, email = ?, phone = ?, financial_goal = ?, label = ?
      WHERE id = ?
    `).run(
      parsed.customer.gender,
      parsed.customer.job,
      parsed.customer.address,
      parsed.customer.email,
      parsed.customer.phone,
      parsed.customer.financial_goal,
      customerLabel,
      customer.id,
    );
  }

  const totalSafe = parsed.assets.total_safe;
  const totalInvest = parsed.assets.total_investment;
  const totalFinancial = totalSafe + totalInvest;
  const savingsRatio =
    parsed.income.total_monthly_income > 0
      ? (parsed.summary.savings_capacity / parsed.income.total_monthly_income) * 100
      : 0;
  const investmentRatio = totalFinancial > 0 ? (totalInvest / totalFinancial) * 100 : 0;

  const snap = db
    .prepare(`
      INSERT INTO snapshots (
        customer_id, snapshot_date, label,
        salary_self, salary_spouse, other_income, bonus, total_monthly_income,
        expense_fixed, expense_variable, total_expense,
        safe_assets, investment_assets, total_financial_assets,
        real_estate_total, total_debt, monthly_debt_payment,
        insurance_premium, net_assets, savings_capacity, savings_ratio, investment_ratio,
        total_assets, overall_return_rate
      )
      VALUES (
        ?, datetime('now'), ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `)
    .run(
      customer.id,
      snapshotLabel,
      parsed.income.salary_self,
      parsed.income.salary_spouse,
      parsed.income.other_income,
      parsed.income.bonus,
      parsed.income.total_monthly_income,
      parsed.expenses.total_fixed,
      parsed.expenses.total_variable,
      parsed.expenses.total,
      totalSafe,
      totalInvest,
      totalFinancial,
      parsed.summary.real_estate_total,
      parsed.summary.total_debt,
      parsed.summary.monthly_debt_payment,
      parsed.summary.insurance_premium,
      parsed.summary.net_assets,
      parsed.summary.savings_capacity,
      Math.round(savingsRatio * 100) / 100,
      Math.round(investmentRatio * 100) / 100,
      parsed.summary.total_assets,
      parsed.summary.overall_return_rate,
    );
  const snapshotId = Number(snap.lastInsertRowid);

  const insertAsset = db.prepare(
    "INSERT INTO assets (snapshot_id, asset_type, product_name, deposit_amount, start_date, end_date, accumulated, return_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const asset of parsed.assets.safe) {
    insertAsset.run(
      snapshotId,
      "safe",
      asset.name,
      asset.amount,
      asset.start_date,
      asset.end_date,
      asset.accumulated,
      asset.return_rate,
    );
  }
  for (const asset of parsed.assets.investment) {
    insertAsset.run(
      snapshotId,
      "investment",
      asset.name,
      asset.amount,
      asset.start_date,
      asset.end_date,
      asset.accumulated,
      asset.return_rate,
    );
  }

  const insertExpense = db.prepare(
    "INSERT INTO expense_details (snapshot_id, category, type, amount) VALUES (?, ?, ?, ?)",
  );
  for (const expense of parsed.expenses.fixed) {
    insertExpense.run(snapshotId, expense.category, "fixed", expense.amount);
  }
  for (const expense of parsed.expenses.variable) {
    insertExpense.run(snapshotId, expense.category, "variable", expense.amount);
  }

  const insertRealEstate = db.prepare(
    "INSERT INTO real_estate (snapshot_id, usage, property_type, ownership, amount, region) VALUES (?, ?, ?, ?, ?, ?)",
  );
  for (const estate of parsed.real_estate) {
    insertRealEstate.run(snapshotId, estate.usage, estate.type, estate.ownership, estate.amount, estate.region);
  }

  const insertDebt = db.prepare(
    "INSERT INTO debts (snapshot_id, usage, debt_type, repayment_method, period, total_balance, interest_rate, monthly_payment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const debt of parsed.debts) {
    insertDebt.run(snapshotId, debt.usage, debt.type, debt.method, debt.period, debt.balance, debt.rate, debt.monthly);
  }

  const insertInsurance = db.prepare(
    "INSERT INTO insurance (snapshot_id, policyholder, insured, product_name, premium) VALUES (?, ?, ?, ?, ?)",
  );
  for (const item of parsed.insurance) {
    insertInsurance.run(snapshotId, item.policyholder, item.insured, item.product, item.premium);
  }

  const existingUser = db
    .prepare("SELECT id FROM users WHERE customer_id = ?")
    .get(customer.id) as { id: number } | undefined;
  if (!existingUser) {
    const bcryptLocal = require("bcryptjs");
    const baseUsername = customerLabel || `customer_${customer.id}`;
    let username = baseUsername;
    let suffix = 1;

    while (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
      username = `${baseUsername}_${suffix}`;
      suffix += 1;
    }

    const initialPassword = getInitialPasswordFromPhone(parsed.customer.phone);
    const hash = bcryptLocal.hashSync(initialPassword, 10);
    db.prepare("INSERT INTO users (username, password, role, customer_id) VALUES (?, ?, 'customer', ?)")
      .run(username, hash, customer.id);
  }

  return { customerId: customer.id, snapshotId, customerLabel };
}
