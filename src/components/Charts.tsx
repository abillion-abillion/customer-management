"use client";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

interface Snapshot {
  total_monthly_income: number;
  expense_fixed: number;
  expense_variable: number;
  total_expense: number;
  safe_assets: number;
  investment_assets: number;
  total_financial_assets: number;
  real_estate_total: number;
  total_debt: number;
  net_assets: number;
  savings_capacity: number;
  insurance_premium: number;
}

interface TrendPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
  savings: number;
  assets: number;
  debt: number;
  net_assets: number;
  real_estate: number;
}

const COLORS = {
  blue: "rgba(59, 130, 246, 0.8)",
  red: "rgba(239, 68, 68, 0.8)",
  green: "rgba(34, 197, 94, 0.8)",
  yellow: "rgba(234, 179, 8, 0.8)",
  purple: "rgba(139, 92, 246, 0.8)",
  pink: "rgba(236, 72, 153, 0.8)",
  indigo: "rgba(99, 102, 241, 0.8)",
  gray: "rgba(156, 163, 175, 0.8)",
};

export function IncomeExpenseChart({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Bar
      data={{
        labels: ["월 소득", "고정지출", "변동지출", "총 지출", "저축가능액"],
        datasets: [{
          label: "금액 (만원)",
          data: [snapshot.total_monthly_income, snapshot.expense_fixed, snapshot.expense_variable, snapshot.total_expense, snapshot.savings_capacity],
          backgroundColor: [COLORS.blue, COLORS.red, COLORS.pink, COLORS.yellow, COLORS.green],
          borderRadius: 8,
        }],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: "소득 vs 지출 (만원)", font: { size: 16 } } },
        scales: { y: { beginAtZero: true } },
      }}
    />
  );
}

export function AssetCompositionChart({ snapshot }: { snapshot: Snapshot }) {
  const data = [snapshot.safe_assets, snapshot.investment_assets, snapshot.real_estate_total].filter(v => v > 0);
  const labels = ["안전자산", "투자자산", "부동산"].filter((_, i) => [snapshot.safe_assets, snapshot.investment_assets, snapshot.real_estate_total][i] > 0);

  if (data.length === 0) return <div className="flex items-center justify-center h-48 text-gray-400">자산 데이터가 없습니다</div>;

  return (
    <Doughnut
      data={{
        labels,
        datasets: [{
          data,
          backgroundColor: [COLORS.blue, COLORS.purple, COLORS.green],
          borderWidth: 2,
          borderColor: "#fff",
        }],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          title: { display: true, text: "자산 구성 (만원)", font: { size: 16 } },
        },
      }}
    />
  );
}

export function BalanceSheetChart({ snapshot }: { snapshot: Snapshot }) {
  return (
    <Bar
      data={{
        labels: ["총 자산", "총 부채", "순자산"],
        datasets: [{
          label: "금액 (만원)",
          data: [snapshot.total_financial_assets + snapshot.real_estate_total, snapshot.total_debt, snapshot.net_assets],
          backgroundColor: [COLORS.blue, COLORS.red, snapshot.net_assets >= 0 ? COLORS.green : COLORS.red],
          borderRadius: 8,
        }],
      }}
      options={{
        responsive: true,
        indexAxis: "y" as const,
        plugins: { legend: { display: false }, title: { display: true, text: "재무상태 요약 (만원)", font: { size: 16 } } },
      }}
    />
  );
}

export function TrendChart({ trends }: { trends: TrendPoint[] }) {
  if (trends.length < 1) return <div className="flex items-center justify-center h-48 text-gray-400">이력 데이터가 부족합니다</div>;

  const labels = trends.map(t => t.label || t.date.slice(0, 10));

  return (
    <Line
      data={{
        labels,
        datasets: [
          { label: "소득", data: trends.map(t => t.income), borderColor: COLORS.blue, backgroundColor: "rgba(59,130,246,0.1)", fill: true, tension: 0.3 },
          { label: "지출", data: trends.map(t => t.expense), borderColor: COLORS.red, backgroundColor: "rgba(239,68,68,0.1)", fill: true, tension: 0.3 },
          { label: "순자산", data: trends.map(t => t.net_assets), borderColor: COLORS.green, backgroundColor: "rgba(34,197,94,0.1)", fill: true, tension: 0.3 },
        ],
      }}
      options={{
        responsive: true,
        plugins: { title: { display: true, text: "재무 추이 (만원)", font: { size: 16 } } },
        scales: { y: { beginAtZero: true } },
      }}
    />
  );
}

export function ExpenseBreakdownChart({ expenses }: { expenses: { category: string; amount: number }[] }) {
  const filtered = expenses.filter(e => e.amount > 0);
  if (filtered.length === 0) return <div className="flex items-center justify-center h-48 text-gray-400">지출 데이터가 없습니다</div>;

  const bgColors = [COLORS.red, COLORS.blue, COLORS.green, COLORS.yellow, COLORS.purple, COLORS.pink, COLORS.indigo, COLORS.gray];

  return (
    <Doughnut
      data={{
        labels: filtered.map(e => e.category),
        datasets: [{
          data: filtered.map(e => e.amount),
          backgroundColor: filtered.map((_, i) => bgColors[i % bgColors.length]),
          borderWidth: 2,
          borderColor: "#fff",
        }],
      }}
      options={{
        responsive: true,
        plugins: {
          legend: { position: "bottom" },
          title: { display: true, text: "지출 항목별 비중 (만원)", font: { size: 16 } },
        },
      }}
    />
  );
}
