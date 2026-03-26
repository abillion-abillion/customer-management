import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

interface Snapshot {
  id: number;
  snapshot_date: string;
  label: string;
  salary_self: number;
  salary_spouse: number;
  other_income: number;
  total_monthly_income: number;
  expense_fixed: number;
  expense_variable: number;
  total_expense: number;
  safe_assets: number;
  investment_assets: number;
  total_financial_assets: number;
  real_estate_total: number;
  total_debt: number;
  insurance_premium: number;
  net_assets: number;
  savings_capacity: number;
}

function generateSwot(snapshots: Snapshot[]) {
  if (snapshots.length === 0) return { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  const latest = snapshots[0];
  const prev = snapshots.length > 1 ? snapshots[1] : null;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  const income = latest.total_monthly_income;
  const expense = latest.total_expense;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;
  const debtToAsset = latest.total_financial_assets > 0 ? (latest.total_debt / latest.total_financial_assets) * 100 : 0;

  // Strengths
  if (savingsRate >= 30) strengths.push(`저축률 ${savingsRate.toFixed(1)}%로 우수한 저축 습관을 보유하고 있습니다.`);
  if (latest.net_assets > 0) strengths.push(`순자산이 ${latest.net_assets.toLocaleString()}만원으로 양(+)의 순자산을 유지하고 있습니다.`);
  if (latest.investment_assets > 0) strengths.push(`투자자산 ${latest.investment_assets.toLocaleString()}만원으로 자산 증식을 위한 투자를 하고 있습니다.`);
  if (latest.insurance_premium > 0) strengths.push(`보장성 보험에 가입하여 리스크 관리를 하고 있습니다.`);

  // Weaknesses
  if (savingsRate < 20 && savingsRate >= 0) weaknesses.push(`저축률이 ${savingsRate.toFixed(1)}%로 낮습니다. 최소 20% 이상을 권장합니다.`);
  if (debtToAsset > 50) weaknesses.push(`부채비율이 ${debtToAsset.toFixed(1)}%로 높습니다. 부채 관리가 필요합니다.`);
  if (latest.total_debt > 0 && latest.total_financial_assets === 0) weaknesses.push(`금융자산 대비 부채가 과다합니다.`);
  if (expense > income) weaknesses.push(`지출(${expense.toLocaleString()}만원)이 소득(${income.toLocaleString()}만원)을 초과하고 있습니다.`);

  // Opportunities
  if (prev) {
    if (latest.total_monthly_income > prev.total_monthly_income) {
      const diff = latest.total_monthly_income - prev.total_monthly_income;
      opportunities.push(`소득이 ${diff.toLocaleString()}만원 증가했습니다. 증가분을 투자에 활용할 수 있습니다.`);
    }
    if (latest.total_debt < prev.total_debt) {
      opportunities.push(`부채가 감소 추세입니다. 지속적인 상환으로 재무건전성이 개선되고 있습니다.`);
    }
    if (latest.net_assets > prev.net_assets) {
      opportunities.push(`순자산이 증가하고 있어 긍정적인 재무 흐름을 보이고 있습니다.`);
    }
  }
  if (savingsRate >= 20 && latest.investment_assets === 0) {
    opportunities.push(`저축률이 양호하므로 일부를 투자자산으로 전환하여 수익률을 높일 수 있습니다.`);
  }

  // Threats
  if (prev) {
    if (latest.total_expense > prev.total_expense) {
      threats.push(`지출이 증가 추세입니다. 변동지출 관리에 주의가 필요합니다.`);
    }
    if (latest.total_debt > prev.total_debt) {
      threats.push(`부채가 증가하고 있습니다. 추가 대출을 자제하고 상환 계획을 세워야 합니다.`);
    }
    if (latest.net_assets < prev.net_assets) {
      threats.push(`순자산이 감소하고 있습니다. 자산 보전 전략이 필요합니다.`);
    }
  }
  if (latest.total_financial_assets > 0 && latest.safe_assets === 0) {
    threats.push(`안전자산(비상금)이 없습니다. 월 생활비의 3~6개월분 비상금 확보를 권장합니다.`);
  }
  if (income > 0 && latest.insurance_premium / income > 0.1) {
    threats.push(`보험료 비중이 소득의 ${((latest.insurance_premium / income) * 100).toFixed(1)}%로 과다할 수 있습니다.`);
  }

  // Default messages if empty
  if (strengths.length === 0) strengths.push("데이터가 충분하지 않아 분석이 제한적입니다.");
  if (weaknesses.length === 0) weaknesses.push("현재 데이터에서 뚜렷한 약점이 발견되지 않았습니다.");
  if (opportunities.length === 0) opportunities.push("이전 데이터와 비교를 위해 추가 스냅샷이 필요합니다.");
  if (threats.length === 0) threats.push("현재 데이터에서 뚜렷한 위협 요인이 발견되지 않았습니다.");

  return { strengths, weaknesses, opportunities, threats };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customerId = parseInt(id);

  if (session.role !== "admin" && session.customerId !== customerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const snapshots = db.prepare("SELECT * FROM snapshots WHERE customer_id = ? ORDER BY snapshot_date DESC").all(customerId) as Snapshot[];

  const swot = generateSwot(snapshots);

  // Trend data for charts
  const trends = snapshots.reverse().map((s) => ({
    date: s.snapshot_date,
    label: s.label,
    income: s.total_monthly_income,
    expense: s.total_expense,
    savings: s.savings_capacity,
    assets: s.total_financial_assets,
    debt: s.total_debt,
    net_assets: s.net_assets,
    real_estate: s.real_estate_total,
  }));

  return NextResponse.json({ swot, trends, snapshotCount: snapshots.length });
}
