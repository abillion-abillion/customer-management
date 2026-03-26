"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AssetCompositionChart,
  BalanceSheetChart,
  ExpenseBreakdownChart,
  IncomeExpenseChart,
  TrendChart,
} from "@/components/Charts";
import { SwotCard } from "@/components/SwotCard";

interface CustomerRecord {
  id: number;
  name: string;
  label: string;
  birth_year: number | null;
  gender: string | null;
  job: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  financial_goal: string | null;
}

interface Snapshot {
  id: number;
  snapshot_date: string;
  label: string;
  salary_self: number;
  salary_spouse: number;
  other_income: number;
  bonus: number;
  total_monthly_income: number;
  expense_fixed: number;
  expense_variable: number;
  total_expense: number;
  safe_assets: number;
  investment_assets: number;
  total_financial_assets: number;
  real_estate_total: number;
  total_debt: number;
  monthly_debt_payment: number;
  insurance_premium: number;
  net_assets: number;
  savings_capacity: number;
  savings_ratio: number;
  investment_ratio: number;
  total_assets: number;
  overall_return_rate: number;
}

interface CustomerDetails {
  assets: Array<{
    asset_type: string;
    product_name: string;
    deposit_amount: number;
    accumulated: number;
    return_rate: number;
  }>;
  expenses: Array<{ category: string; type: string; amount: number }>;
  real_estate: Array<{ usage: string; property_type: string; ownership: string; amount: number; region: string }>;
  debts: Array<{ usage: string; debt_type: string; total_balance: number; interest_rate: number; monthly_payment: number }>;
  insurance: Array<{ policyholder: string; insured: string; product_name: string; premium: number }>;
}

interface PortfolioFile {
  id: number;
  snapshot_id: number | null;
  snapshot_label: string | null;
  original_name: string;
  file_url?: string;
  mime_type: string | null;
  file_size: number;
  note: string | null;
  created_at: string;
}

interface CustomerApiResponse {
  customer: CustomerRecord;
  snapshots: Snapshot[];
  details: CustomerDetails | null;
  portfolioFiles: PortfolioFile[];
}

interface AnalysisResponse {
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  insights: {
    praise: string[];
    improvements: string[];
  };
  trends: Array<{
    date: string;
    label: string;
    income: number;
    expense: number;
    savings: number;
    assets: number;
    debt: number;
    net_assets: number;
    real_estate: number;
    total_assets: number;
    overall_return_rate: number;
  }>;
  snapshotCount: number;
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  return value.toLocaleString("ko-KR");
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return dateString.slice(0, 10);
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isImageFile(file: PortfolioFile): boolean {
  if (file.mime_type?.startsWith("image/")) return true;
  return /\.(png|jpe?g|webp|gif)$/i.test(file.original_name);
}

function isPdfFile(file: PortfolioFile): boolean {
  if (file.mime_type === "application/pdf") return true;
  return /\.pdf$/i.test(file.original_name);
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<{ role: "admin" | "customer"; customerId?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [customerData, setCustomerData] = useState<CustomerApiResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [portfolioNote, setPortfolioNote] = useState("");
  const [portfolioSnapshotId, setPortfolioSnapshotId] = useState<string>("");
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [portfolioMessage, setPortfolioMessage] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionRes, customerRes, analysisRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/customers/${id}`),
        fetch(`/api/analysis/${id}`),
      ]);

      if (sessionRes.status === 401) {
        router.push("/");
        return;
      }

      const sessionData = await sessionRes.json();
      setSession(sessionData);

      if (!customerRes.ok) {
        if (customerRes.status === 401 || customerRes.status === 403) {
          router.push("/");
          return;
        }
        throw new Error("고객 정보를 불러오지 못했습니다.");
      }
      setCustomerData(await customerRes.json());

      if (analysisRes.ok) {
        setAnalysis(await analysisRes.json());
      } else {
        setAnalysis(null);
      }
    } catch {
      setCustomerData(null);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (session?.role !== "admin") return;
    if (portfolioSnapshotId) return;
    const latestId = customerData?.snapshots?.[0]?.id;
    if (latestId) setPortfolioSnapshotId(String(latestId));
  }, [session, customerData, portfolioSnapshotId]);

  const latestSnapshot = useMemo(() => customerData?.snapshots?.[0] ?? null, [customerData]);
  const expenseChartData = useMemo(
    () => customerData?.details?.expenses?.map((expense) => ({ category: expense.category, amount: expense.amount })) ?? [],
    [customerData],
  );

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  }

  async function handlePortfolioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !customerData) return;

    setPortfolioUploading(true);
    setPortfolioMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (portfolioNote.trim()) formData.append("note", portfolioNote.trim());
      if (portfolioSnapshotId) formData.append("snapshotId", portfolioSnapshotId);

      const response = await fetch(`/api/portfolio/${customerData.customer.id}`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setPortfolioMessage(`업로드 실패: ${data.error || "알 수 없는 오류"}`);
      } else {
        setPortfolioMessage("포트폴리오 파일 업로드가 완료되었습니다.");
        setPortfolioNote("");
        setPortfolioSnapshotId("");
        await fetchAll();
      }
    } catch {
      setPortfolioMessage("업로드 실패: 서버 연결 오류");
    } finally {
      setPortfolioUploading(false);
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">고객 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (!customerData || !customerData.customer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-500">고객 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const { customer, snapshots, details, portfolioFiles } = customerData;
  const income = latestSnapshot?.total_monthly_income ?? 0;
  const expense = latestSnapshot?.total_expense ?? 0;
  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            {session?.role === "admin" && (
              <button
                onClick={() => router.push("/admin")}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                목록으로
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {customer.name}
                <span className="ml-2 text-sm font-normal text-slate-500">{customer.label}</span>
              </h1>
              <p className="text-sm text-slate-500">
                고객 전용 페이지 · 누적 스냅샷 {snapshots.length}건
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:border-rose-300 hover:text-rose-600"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8">
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          {[
            { label: "월 소득", value: formatNumber(income), unit: "만원", className: "text-sky-700" },
            { label: "월 지출", value: formatNumber(expense), unit: "만원", className: "text-rose-600" },
            { label: "저축 가능액", value: formatNumber(latestSnapshot?.savings_capacity), unit: "만원", className: "text-emerald-700" },
            { label: "저축률", value: savingsRate.toFixed(1), unit: "%", className: savingsRate >= 20 ? "text-emerald-700" : "text-amber-600" },
            { label: "총자산", value: formatNumber(latestSnapshot?.total_assets), unit: "만원", className: "text-slate-900" },
            { label: "순자산", value: formatNumber(latestSnapshot?.net_assets), unit: "만원", className: (latestSnapshot?.net_assets ?? 0) >= 0 ? "text-emerald-700" : "text-rose-600" },
            {
              label: "총자산 수익률",
              value: (latestSnapshot?.overall_return_rate ?? 0).toFixed(2),
              unit: "%",
              className: (latestSnapshot?.overall_return_rate ?? 0) >= 0 ? "text-violet-700" : "text-rose-600",
            },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-xs text-slate-500">{card.label}</p>
              <p className={`mt-1 text-xl font-bold ${card.className}`}>{card.value}</p>
              <p className="text-xs text-slate-400">{card.unit}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">기본 정보</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2 lg:grid-cols-4">
            <p><span className="text-slate-500">성별:</span> {customer.gender || "-"}</p>
            <p><span className="text-slate-500">출생년도:</span> {customer.birth_year ? `${customer.birth_year}년` : "-"}</p>
            <p><span className="text-slate-500">직업:</span> {customer.job || "-"}</p>
            <p><span className="text-slate-500">연락처:</span> {customer.phone || "-"}</p>
            <p className="md:col-span-2"><span className="text-slate-500">주소:</span> {customer.address || "-"}</p>
            <p className="md:col-span-2"><span className="text-slate-500">이메일:</span> {customer.email || "-"}</p>
            <p className="lg:col-span-4"><span className="text-slate-500">재무 목표:</span> {customer.financial_goal || "-"}</p>
          </div>
        </section>

        {analysis?.insights && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="text-lg font-semibold text-emerald-900">칭찬 포인트</h2>
              <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                {analysis.insights.praise.map((item, index) => (
                  <li key={`praise-${index}`}>- {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-lg font-semibold text-amber-900">개선 포인트</h2>
              <ul className="mt-3 space-y-2 text-sm text-amber-900">
                {analysis.insights.improvements.map((item, index) => (
                  <li key={`improve-${index}`}>- {item}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {latestSnapshot && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <IncomeExpenseChart snapshot={latestSnapshot} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <AssetCompositionChart snapshot={latestSnapshot} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <BalanceSheetChart snapshot={latestSnapshot} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <ExpenseBreakdownChart expenses={expenseChartData} />
            </div>
          </section>
        )}

        {analysis?.trends?.length ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <TrendChart trends={analysis.trends} />
          </section>
        ) : null}

        {analysis?.swot && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">SWOT 분석</h2>
            <SwotCard swot={analysis.swot} />
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">포트폴리오 자료 (PDF/이미지)</h2>
              <p className="mt-1 text-sm text-slate-500">상담 자료, 운용 리포트, 포트폴리오 캡처를 고객별로 누적 저장</p>
            </div>

            {session?.role === "admin" && (
              <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-sm font-medium text-slate-700">관리자 업로드</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <select
                    value={portfolioSnapshotId}
                    onChange={(e) => setPortfolioSnapshotId(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">점검 이력 연결 안함</option>
                    {snapshots.map((snapshot) => (
                      <option key={snapshot.id} value={String(snapshot.id)}>
                        {snapshot.label} ({formatDate(snapshot.snapshot_date)})
                      </option>
                    ))}
                  </select>
                  <input
                    value={portfolioNote}
                    onChange={(e) => setPortfolioNote(e.target.value)}
                    placeholder="메모 (선택)"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div className="mt-2">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif"
                    onChange={handlePortfolioUpload}
                    disabled={portfolioUploading}
                    className="block text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-50"
                  />
                </div>
                {portfolioMessage && (
                  <p className={`mt-2 text-xs ${portfolioMessage.startsWith("포트폴리오 파일 업로드") ? "text-emerald-700" : "text-rose-600"}`}>
                    {portfolioMessage}
                  </p>
                )}
              </div>
            )}
          </div>

          {portfolioFiles.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">업로드된 포트폴리오 자료가 없습니다.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {portfolioFiles.map((file) => (
                <article key={file.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {(() => {
                    const fileUrl = file.file_url || `/api/portfolio/file/${file.id}`;
                    return isImageFile(file) ? (
                      <a href={fileUrl} target="_blank" rel="noreferrer" className="block">
                        <img
                          src={fileUrl}
                          alt={file.original_name}
                          className="h-44 w-full object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-44 items-center justify-center bg-slate-100 text-sm font-medium text-slate-600"
                      >
                        {isPdfFile(file) ? "PDF 문서 열기" : "파일 열기"}
                      </a>
                    );
                  })()}
                  <div className="space-y-1 p-4 text-sm">
                    <p className="truncate font-medium text-slate-900">{file.original_name}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(file.created_at)} · {formatFileSize(file.file_size)}
                    </p>
                    {file.snapshot_label && (
                      <p className="text-xs text-sky-700">연결 이력: {file.snapshot_label}</p>
                    )}
                    {file.note && (
                      <p className="text-xs text-slate-600">{file.note}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {details && (
          <section className="grid gap-6">
            {details.assets.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">금융자산 상세</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">구분</th>
                        <th className="px-4 py-3 text-left">상품명</th>
                        <th className="px-4 py-3 text-right">가입금액</th>
                        <th className="px-4 py-3 text-right">누적원금</th>
                        <th className="px-4 py-3 text-right">수익률</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.assets.map((asset, index) => (
                        <tr key={`${asset.product_name}-${index}`} className="hover:bg-sky-50">
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-1 text-xs ${
                                asset.asset_type === "safe" ? "bg-sky-100 text-sky-700" : "bg-violet-100 text-violet-700"
                              }`}
                            >
                              {asset.asset_type === "safe" ? "안전자산" : "투자자산"}
                            </span>
                          </td>
                          <td className="px-4 py-3">{asset.product_name || "-"}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(asset.deposit_amount)}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(asset.accumulated)}</td>
                          <td className="px-4 py-3 text-right">{asset.return_rate ? `${asset.return_rate}%` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {details.debts.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">부채 상세</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">용도</th>
                        <th className="px-4 py-3 text-left">종류</th>
                        <th className="px-4 py-3 text-right">잔액</th>
                        <th className="px-4 py-3 text-right">금리</th>
                        <th className="px-4 py-3 text-right">월상환액</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.debts.map((debt, index) => (
                        <tr key={`${debt.usage}-${index}`} className="hover:bg-rose-50">
                          <td className="px-4 py-3">{debt.usage || "-"}</td>
                          <td className="px-4 py-3">{debt.debt_type || "-"}</td>
                          <td className="px-4 py-3 text-right text-rose-600">{formatNumber(debt.total_balance)}</td>
                          <td className="px-4 py-3 text-right">{debt.interest_rate ? `${debt.interest_rate}%` : "-"}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(debt.monthly_payment)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {details.insurance.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">보장성 보험</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">계약자</th>
                        <th className="px-4 py-3 text-left">피보험자</th>
                        <th className="px-4 py-3 text-left">상품명</th>
                        <th className="px-4 py-3 text-right">보험료</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.insurance.map((item, index) => (
                        <tr key={`${item.product_name}-${index}`} className="hover:bg-emerald-50">
                          <td className="px-4 py-3">{item.policyholder || "-"}</td>
                          <td className="px-4 py-3">{item.insured || "-"}</td>
                          <td className="px-4 py-3">{item.product_name || "-"}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(item.premium)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {details.real_estate.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <h2 className="font-semibold text-slate-900">부동산</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 text-left">용도</th>
                        <th className="px-4 py-3 text-left">종류</th>
                        <th className="px-4 py-3 text-left">소유형태</th>
                        <th className="px-4 py-3 text-right">금액</th>
                        <th className="px-4 py-3 text-left">지역</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {details.real_estate.map((estate, index) => (
                        <tr key={`${estate.usage}-${index}`} className="hover:bg-teal-50">
                          <td className="px-4 py-3">{estate.usage || "-"}</td>
                          <td className="px-4 py-3">{estate.property_type || "-"}</td>
                          <td className="px-4 py-3">{estate.ownership || "-"}</td>
                          <td className="px-4 py-3 text-right">{formatNumber(estate.amount)}</td>
                          <td className="px-4 py-3">{estate.region || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {snapshots.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
              <h2 className="font-semibold text-slate-900">점검 이력 로그</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">날짜</th>
                    <th className="px-4 py-3 text-left">라벨</th>
                    <th className="px-4 py-3 text-right">월소득</th>
                    <th className="px-4 py-3 text-right">월지출</th>
                    <th className="px-4 py-3 text-right">총자산</th>
                    <th className="px-4 py-3 text-right">부채</th>
                    <th className="px-4 py-3 text-right">순자산</th>
                    <th className="px-4 py-3 text-right">수익률</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {snapshots.map((snapshot, index) => (
                    <tr key={snapshot.id} className={index === 0 ? "bg-sky-50 font-semibold" : "hover:bg-slate-50"}>
                      <td className="px-4 py-3">{formatDate(snapshot.snapshot_date)}</td>
                      <td className="px-4 py-3">{snapshot.label || "-"}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(snapshot.total_monthly_income)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(snapshot.total_expense)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(snapshot.total_assets)}</td>
                      <td className="px-4 py-3 text-right text-rose-600">{formatNumber(snapshot.total_debt)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(snapshot.net_assets)}</td>
                      <td className="px-4 py-3 text-right">{snapshot.overall_return_rate?.toFixed(2) || "0.00"}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
