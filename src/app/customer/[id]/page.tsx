"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { IncomeExpenseChart, AssetCompositionChart, BalanceSheetChart, TrendChart, ExpenseBreakdownChart } from "@/components/Charts";
import { SwotCard } from "@/components/SwotCard";

interface CustomerData {
  customer: {
    id: number; name: string; label: string; birth_year: number; gender: string;
    job: string; address: string; email: string; phone: string; financial_goal: string;
  };
  snapshots: Array<{
    id: number; snapshot_date: string; label: string;
    salary_self: number; salary_spouse: number; other_income: number; bonus: number;
    total_monthly_income: number; expense_fixed: number; expense_variable: number; total_expense: number;
    safe_assets: number; investment_assets: number; total_financial_assets: number;
    real_estate_total: number; total_debt: number; monthly_debt_payment: number;
    insurance_premium: number; net_assets: number; savings_capacity: number;
  }>;
  details: {
    assets: Array<{ asset_type: string; product_name: string; accumulated: number; return_rate: number; deposit_amount: number }>;
    expenses: Array<{ category: string; type: string; amount: number }>;
    real_estate: Array<{ usage: string; property_type: string; ownership: string; amount: number; region: string }>;
    debts: Array<{ usage: string; debt_type: string; total_balance: number; interest_rate: number; monthly_payment: number }>;
    insurance: Array<{ policyholder: string; insured: string; product_name: string; premium: number }>;
  } | null;
}

interface AnalysisData {
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  trends: Array<{ date: string; label: string; income: number; expense: number; savings: number; assets: number; debt: number; net_assets: number; real_estate: number }>;
  snapshotCount: number;
}

function fmt(n: number | undefined | null): string {
  if (n === null || n === undefined) return "0";
  return n.toLocaleString();
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CustomerData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [session, setSession] = useState<{ role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(s => {
      if (s.error) { router.push("/"); return; }
      setSession(s);
    });
    fetch(`/api/customers/${id}`).then(r => r.json()).then(setData);
    fetch(`/api/analysis/${id}`).then(r => r.json()).then(setAnalysis);
  }, [id, router]);

  if (!data || !data.customer) return (
    <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-gray-400 text-lg">로딩 중...</div></div>
  );

  const { customer, snapshots, details } = data;
  const latest = snapshots[0];
  const income = latest?.total_monthly_income || 0;
  const expense = latest?.total_expense || 0;
  const savingsRate = income > 0 ? ((income - expense) / income * 100) : 0;

  const allExpenses = details?.expenses?.map(e => ({ category: e.category, amount: e.amount })) || [];

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {session?.role === "admin" && (
              <button onClick={() => router.push("/admin")} className="text-blue-600 hover:text-blue-800 text-sm">
                &larr; 목록으로
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-800">
              {customer.name} <span className="text-base font-normal text-gray-400">({customer.label})</span>
            </h1>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition text-sm">로그아웃</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: "월 소득", value: fmt(income), unit: "만원", color: "text-blue-600" },
            { label: "월 지출", value: fmt(expense), unit: "만원", color: "text-red-600" },
            { label: "저축가능액", value: fmt(latest?.savings_capacity), unit: "만원", color: "text-green-600" },
            { label: "저축률", value: savingsRate.toFixed(1), unit: "%", color: savingsRate >= 20 ? "text-green-600" : "text-red-600" },
            { label: "순자산", value: fmt(latest?.net_assets), unit: "만원", color: (latest?.net_assets || 0) >= 0 ? "text-green-600" : "text-red-600" },
            { label: "총 부채", value: fmt(latest?.total_debt), unit: "만원", color: "text-red-600" },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="bg-white rounded-xl shadow-sm border p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400">{unit}</div>
            </div>
          ))}
        </div>

        {/* Customer Info */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-3">기본 정보</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><span className="text-gray-500">성별:</span> {customer.gender || "-"}</div>
            <div><span className="text-gray-500">출생년도:</span> {customer.birth_year ? `${customer.birth_year}년` : "-"}</div>
            <div><span className="text-gray-500">직업:</span> {customer.job || "-"}</div>
            <div><span className="text-gray-500">주소:</span> {customer.address || "-"}</div>
            <div><span className="text-gray-500">연락처:</span> {customer.phone || "-"}</div>
            <div><span className="text-gray-500">이메일:</span> {customer.email || "-"}</div>
            <div className="col-span-2"><span className="text-gray-500">재무목표:</span> {customer.financial_goal || "-"}</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        {latest && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <IncomeExpenseChart snapshot={latest} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <AssetCompositionChart snapshot={latest} />
            </div>
          </div>
        )}

        {/* Charts Row 2 */}
        {latest && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <BalanceSheetChart snapshot={latest} />
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <ExpenseBreakdownChart expenses={allExpenses} />
            </div>
          </div>
        )}

        {/* Trend Chart */}
        {analysis && analysis.trends.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <TrendChart trends={analysis.trends} />
          </div>
        )}

        {/* SWOT Analysis */}
        {analysis && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">SWOT 분석</h2>
            <SwotCard swot={analysis.swot} />
          </div>
        )}

        {/* Detail Tables */}
        {details && (
          <div className="space-y-6">

            {/* Assets Table */}
            {details.assets.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-semibold">금융자산 상세</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">구분</th>
                        <th className="px-4 py-3 text-left">상품명</th>
                        <th className="px-4 py-3 text-right">가입금액</th>
                        <th className="px-4 py-3 text-right">누적원금</th>
                        <th className="px-4 py-3 text-right">수익률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {details.assets.map((a, i) => (
                        <tr key={i} className="hover:bg-blue-50">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${a.asset_type === "safe" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                              {a.asset_type === "safe" ? "안전" : "투자"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{a.product_name}</td>
                          <td className="px-4 py-3 text-right">{fmt(a.deposit_amount)}</td>
                          <td className="px-4 py-3 text-right">{fmt(a.accumulated)}</td>
                          <td className="px-4 py-3 text-right">{a.return_rate ? `${a.return_rate}%` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Debts Table */}
            {details.debts.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-semibold">부채 상세</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">용도</th>
                        <th className="px-4 py-3 text-left">종류</th>
                        <th className="px-4 py-3 text-right">잔액 (만원)</th>
                        <th className="px-4 py-3 text-right">금리</th>
                        <th className="px-4 py-3 text-right">월상환액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {details.debts.map((d, i) => (
                        <tr key={i} className="hover:bg-red-50">
                          <td className="px-4 py-3">{d.usage}</td>
                          <td className="px-4 py-3">{d.debt_type}</td>
                          <td className="px-4 py-3 text-right text-red-600">{fmt(d.total_balance)}</td>
                          <td className="px-4 py-3 text-right">{d.interest_rate ? `${d.interest_rate}%` : "-"}</td>
                          <td className="px-4 py-3 text-right">{fmt(d.monthly_payment)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Insurance Table */}
            {details.insurance.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-semibold">보장성 보험</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">계약자</th>
                        <th className="px-4 py-3 text-left">피보험자</th>
                        <th className="px-4 py-3 text-left">상품명</th>
                        <th className="px-4 py-3 text-right">보험료 (만원)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {details.insurance.map((ins, i) => (
                        <tr key={i} className="hover:bg-green-50">
                          <td className="px-4 py-3">{ins.policyholder}</td>
                          <td className="px-4 py-3">{ins.insured}</td>
                          <td className="px-4 py-3">{ins.product_name}</td>
                          <td className="px-4 py-3 text-right">{fmt(ins.premium)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Real Estate Table */}
            {details.real_estate.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-semibold">부동산</h2></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left">용도</th>
                        <th className="px-4 py-3 text-left">종류</th>
                        <th className="px-4 py-3 text-left">소유형태</th>
                        <th className="px-4 py-3 text-right">금액 (만원)</th>
                        <th className="px-4 py-3 text-left">지역</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {details.real_estate.map((r, i) => (
                        <tr key={i} className="hover:bg-green-50">
                          <td className="px-4 py-3">{r.usage}</td>
                          <td className="px-4 py-3">{r.property_type}</td>
                          <td className="px-4 py-3">{r.ownership}</td>
                          <td className="px-4 py-3 text-right">{fmt(r.amount)}</td>
                          <td className="px-4 py-3">{r.region}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Snapshot History */}
        {snapshots.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50"><h2 className="font-semibold">점검 이력</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left">날짜</th>
                    <th className="px-4 py-3 text-left">라벨</th>
                    <th className="px-4 py-3 text-right">월소득</th>
                    <th className="px-4 py-3 text-right">월지출</th>
                    <th className="px-4 py-3 text-right">금융자산</th>
                    <th className="px-4 py-3 text-right">부채</th>
                    <th className="px-4 py-3 text-right">순자산</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {snapshots.map((s, i) => (
                    <tr key={i} className={i === 0 ? "bg-blue-50 font-semibold" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3">{s.snapshot_date?.slice(0, 10)}</td>
                      <td className="px-4 py-3">{s.label}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.total_monthly_income)}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.total_expense)}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.total_financial_assets)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{fmt(s.total_debt)}</td>
                      <td className="px-4 py-3 text-right">{fmt(s.net_assets)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
