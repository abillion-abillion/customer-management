"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface Customer {
  id: number;
  name: string;
  label: string;
  birth_year: number | null;
  gender: string | null;
  job: string | null;
  phone: string | null;
}

const SNAPSHOT_LABELS = [
  "컨설팅 전",
  "컨설팅 후",
  "1차 점검",
  "2차 점검",
  "3차 점검",
  "분기 점검",
  "연간 점검",
];

export default function AdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [uploadLabel, setUploadLabel] = useState(SNAPSHOT_LABELS[0]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [fetching, setFetching] = useState(false);
  const router = useRouter();

  const customerCountText = useMemo(() => `${customers.length}명`, [customers.length]);

  const fetchCustomers = useCallback(
    async (keyword = "") => {
      setFetching(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(keyword)}`);
        if (res.status === 401) {
          router.push("/");
          return;
        }
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } finally {
        setFetching(false);
      }
    },
    [router],
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  async function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    fetchCustomers(searchKeyword.trim());
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", uploadLabel);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setUploadResult(`업로드 실패: ${data.error || "알 수 없는 오류"}`);
      } else {
        setUploadResult(`업로드 완료: ${data.customerLabel}`);
        fetchCustomers(searchKeyword.trim());
      }
    } catch {
      setUploadResult("업로드 실패: 서버 연결 오류");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">고객 재무관리 관리자</h1>
            <p className="text-sm text-slate-500">엑셀 업로드, 고객 검색, 고객 상세 페이지 이동</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 transition hover:border-red-300 hover:text-red-600"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">재무제표 업로드</h2>
          <p className="mt-1 text-sm text-slate-500">`.xlsx` 파일을 업로드하면 고객/스냅샷 로그가 자동 저장됩니다.</p>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm text-slate-600">스냅샷 라벨</label>
              <select
                value={uploadLabel}
                onChange={(e) => setUploadLabel(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              >
                {SNAPSHOT_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-600">재무제표 파일</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                disabled={uploading}
                className="block text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-50"
              />
            </div>

            {uploading && <span className="text-sm text-sky-700">업로드 중...</span>}
          </div>

          {uploadResult && (
            <p className={`mt-4 text-sm ${uploadResult.startsWith("업로드 완료") ? "text-emerald-700" : "text-rose-600"}`}>
              {uploadResult}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">고객 검색</h2>
              <p className="mt-1 text-sm text-slate-500">이름 또는 라벨 예시: `95_여_권태희`</p>
            </div>
            <div className="text-sm text-slate-500">총 고객 {customerCountText}</div>
          </div>

          <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-3">
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="고객명 또는 라벨을 입력하세요"
              className="min-w-[260px] flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              검색
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchKeyword("");
                fetchCustomers("");
              }}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              초기화
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">고객 목록</h2>
          </div>

          {fetching ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">목록을 불러오는 중...</div>
          ) : customers.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              검색 결과가 없습니다. 재무제표를 업로드하면 자동으로 고객이 생성됩니다.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => router.push(`/customer/${customer.id}`)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition hover:bg-sky-50"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{customer.name || "미상"}</p>
                    <p className="text-sm text-slate-500">{customer.label || "-"}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>
                      {customer.birth_year ? `${customer.birth_year}년생` : "-"}
                      {customer.gender ? ` · ${customer.gender}` : ""}
                    </p>
                    <p>{customer.job || "-"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
