"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Customer {
  id: number;
  name: string;
  label: string;
  birth_year: number;
  gender: string;
  job: string;
  phone: string;
}

export default function AdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");
  const [label, setLabel] = useState("컨설팅 전");
  const router = useRouter();

  const fetchCustomers = useCallback(async (q = "") => {
    const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
    if (res.status === 401) { router.push("/"); return; }
    const data = await res.json();
    setCustomers(data);
  }, [router]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchCustomers(search);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setUploadResult(`${data.customerLabel} 업로드 완료!`);
        fetchCustomers();
      } else {
        setUploadResult(`오류: ${data.error}`);
      }
    } catch {
      setUploadResult("업로드 실패");
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">관리자 대시보드</h1>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 transition text-sm">
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">재무제표 업로드</h2>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">스냅샷 라벨</label>
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="px-4 py-2 border rounded-lg bg-white"
              >
                <option value="컨설팅 전">컨설팅 전</option>
                <option value="컨설팅 후">컨설팅 후</option>
                <option value="1차 점검">1차 점검</option>
                <option value="2차 점검">2차 점검</option>
                <option value="3차 점검">3차 점검</option>
                <option value="분기 점검">분기 점검</option>
                <option value="연간 점검">연간 점검</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">엑셀 파일 (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleUpload}
                disabled={uploading}
                className="block text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer"
              />
            </div>
            {uploading && <span className="text-blue-600 text-sm animate-pulse">업로드 중...</span>}
            {uploadResult && (
              <span className={`text-sm ${uploadResult.includes("오류") ? "text-red-600" : "text-green-600"}`}>
                {uploadResult}
              </span>
            )}
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">고객 검색</h2>
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 또는 라벨로 검색 (예: 95_여_권태희)"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              검색
            </button>
            <button type="button" onClick={() => { setSearch(""); fetchCustomers(); }} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition">
              초기화
            </button>
          </form>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">고객 목록 ({customers.length}명)</h2>
          </div>
          {customers.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              등록된 고객이 없습니다. 엑셀 파일을 업로드해주세요.
            </div>
          ) : (
            <div className="divide-y">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/customer/${c.id}`)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-blue-50 transition text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {c.name?.[0] || "?"}
                    </div>
                    <div>
                      <div className="font-medium">{c.name || "미상"}</div>
                      <div className="text-sm text-gray-500">{c.label}</div>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{c.gender || ""} / {c.birth_year ? `${c.birth_year}년생` : ""}</div>
                    <div>{c.job || ""}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
