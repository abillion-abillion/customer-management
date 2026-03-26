# 고객 재무관리 시스템 - 프로젝트 요약서

## 1. 프로젝트 개요

### 목적
- 100명 이상의 고객 재무제표를 웹에서 통합 관리
- 고객별 재무상태(현금흐름, 금융자산, 부동산, 부채, 보험)를 시각적으로 표시
- 컨설팅 전/후 변화를 그래프와 SWOT 분석으로 자동 제공
- 고객이 본인 ID/PW로 로그인하여 상시 자산내역 확인 가능

### 기술 스택
| 구분 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| 백엔드 | Next.js API Routes (App Router) |
| 데이터베이스 | SQLite (better-sqlite3) |
| 차트 | Chart.js + react-chartjs-2 |
| 인증 | JWT (jsonwebtoken) + bcryptjs |
| 엑셀 파싱 | xlsx (SheetJS) |

---

## 2. 아키텍처 스케치

```
┌────────────────────────────────────────────────────────────┐
│                    프론트엔드 (React/Next.js)                │
│                                                            │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │ 로그인    │  │ 관리자 대시보드│  │ 고객 상세 페이지   │     │
│  │ (page.tsx)│  │ (admin/)     │  │ (customer/[id]/)  │     │
│  └────┬─────┘  └──────┬───────┘  └────────┬──────────┘     │
│       │               │                   │                │
│       └───────────────┼───────────────────┘                │
│                       │                                    │
├───────────────────────┼────────────────────────────────────┤
│                   API Routes                               │
│                       │                                    │
│  ┌─────────┐  ┌──────┴──────┐  ┌──────────┐  ┌─────────┐  │
│  │/api/auth │  │/api/customers│  │/api/upload│  │/api/     │  │
│  │         │  │/api/customers│  │          │  │analysis/ │  │
│  │ POST    │  │  /[id]      │  │ POST     │  │  [id]    │  │
│  │ DELETE  │  │  GET        │  │ (엑셀)   │  │  GET     │  │
│  └────┬────┘  └──────┬──────┘  └────┬─────┘  └────┬────┘  │
│       │              │              │              │       │
├───────┼──────────────┼──────────────┼──────────────┼───────┤
│       └──────────────┴──────────────┴──────────────┘       │
│                          │                                 │
│                    SQLite (financial.db)                    │
│                                                            │
│  users │ customers │ snapshots │ assets │ expenses │ ...   │
└────────────────────────────────────────────────────────────┘
```

### 페이지 구성
```
/                       → 로그인 페이지
/admin                  → 관리자 대시보드 (고객 검색, 엑셀 업로드, 고객 목록)
/customer/[id]          → 고객 상세 페이지 (재무 요약, 차트, SWOT, 상세 테이블)
```

### 사용자 흐름
```
관리자:  로그인 → 대시보드 → 엑셀 업로드 → 고객 검색 → 고객 상세 보기
고객:    로그인 → 본인 상세 페이지 (자동 리다이렉트)
```

---

## 3. 데이터베이스 스키마

### users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동증가 |
| username | TEXT UNIQUE | 로그인 아이디 (예: 95_여_권태희) |
| password | TEXT | bcrypt 해시 |
| role | TEXT | 'admin' 또는 'customer' |
| customer_id | INTEGER | 고객 FK (admin은 null) |

### customers
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | INTEGER PK | 자동증가 |
| name | TEXT | 이름 |
| birth_year | INTEGER | 출생년도 |
| gender | TEXT | 성별 |
| job | TEXT | 직업 |
| address, email, phone | TEXT | 연락처 |
| financial_goal | TEXT | 재무목표 |
| label | TEXT | 라벨 (예: 95_여_권태희) |

### snapshots (스냅샷 = 특정 시점의 재무 요약)
| 컬럼 | 설명 |
|------|------|
| customer_id | 고객 FK |
| snapshot_date | 기록 날짜 |
| label | 컨설팅 전/후/1차 점검 등 |
| salary_self, salary_spouse, other_income, bonus | 소득 항목 |
| total_monthly_income | 월 총소득 |
| expense_fixed, expense_variable, total_expense | 지출 항목 |
| safe_assets, investment_assets, total_financial_assets | 금융자산 |
| real_estate_total | 부동산 합계 |
| total_debt, monthly_debt_payment | 부채 |
| insurance_premium | 보험료 합계 |
| net_assets, savings_capacity | 순자산, 저축가능액 |

### 상세 테이블
- **assets**: 금융자산 상세 (안전/투자, 상품명, 가입금액, 누적원금, 수익률)
- **expense_details**: 지출 항목별 상세 (카테고리, 고정/변동, 금액)
- **real_estate**: 부동산 (용도, 종류, 소유형태, 금액, 지역)
- **debts**: 부채 (용도, 종류, 상환방식, 잔액, 금리, 월상환액)
- **insurance**: 보험 (계약자, 피보험자, 상품명, 보험료)

---

## 4. 주요 기능

### 4.1 로그인/인증
- JWT 토큰 기반 인증 (쿠키 저장, 7일 유효)
- 관리자: admin / admin1234
- 고객: 엑셀 업로드 시 자동 생성 (라벨이 아이디, 초기 비밀번호 1234)

### 4.2 관리자 대시보드 (`/admin`)
- **엑셀 업로드**: 재무제표 .xlsx 파일 업로드 → 자동 파싱 → DB 저장
- **스냅샷 라벨**: 컨설팅 전/후, 1~3차 점검, 분기/연간 점검
- **고객 검색**: 이름 또는 라벨로 검색 (예: 95_여_권태희)
- **고객 목록**: 이름순 정렬, 클릭하면 상세 페이지로 이동

### 4.3 고객 상세 페이지 (`/customer/[id]`)
- **요약 카드**: 월소득, 월지출, 저축가능액, 저축률, 순자산, 총부채
- **기본 정보**: 성별, 출생년도, 직업, 주소, 연락처, 재무목표
- **차트**:
  - 소득 vs 지출 막대차트
  - 자산 구성 도넛차트 (안전/투자/부동산)
  - 재무상태 요약 가로 막대차트 (총자산/총부채/순자산)
  - 지출 항목별 비중 도넛차트
  - 재무 추이 라인차트 (소득/지출/순자산 시계열)
- **SWOT 분석**: 재무 데이터 기반 자동 생성
- **상세 테이블**: 금융자산, 부채, 보험, 부동산 각각의 테이블
- **점검 이력**: 스냅샷 간 비교 테이블

### 4.4 SWOT 분석 로직
| 구분 | 분석 기준 |
|------|----------|
| **S (강점)** | 저축률 30%↑, 순자산 양(+), 투자자산 보유, 보험 가입 |
| **W (약점)** | 저축률 20%↓, 부채비율 50%↑, 지출 > 소득 |
| **O (기회)** | 소득 증가, 부채 감소, 순자산 증가 추세, 투자 전환 가능 |
| **T (위협)** | 지출 증가, 부채 증가, 순자산 감소, 비상금 부재, 보험료 과다 |

---

## 5. 파일 구조 및 소스코드

```
고객관리/
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── data/                          # SQLite DB (gitignore)
├── public/uploads/                # 업로드된 엑셀 파일 (gitignore)
└── src/
    ├── app/
    │   ├── globals.css            # Tailwind import
    │   ├── layout.tsx             # 루트 레이아웃
    │   ├── page.tsx               # 로그인 페이지
    │   ├── not-found.tsx          # 404 페이지
    │   ├── admin/
    │   │   └── page.tsx           # 관리자 대시보드
    │   ├── customer/
    │   │   └── [id]/
    │   │       └── page.tsx       # 고객 상세 페이지
    │   └── api/
    │       ├── auth/
    │       │   ├── route.ts       # POST: 로그인, DELETE: 로그아웃
    │       │   └── me/
    │       │       └── route.ts   # GET: 현재 세션 확인
    │       ├── customers/
    │       │   ├── route.ts       # GET: 고객 목록 (검색)
    │       │   └── [id]/
    │       │       └── route.ts   # GET: 고객 상세 데이터
    │       ├── upload/
    │       │   └── route.ts       # POST: 엑셀 파일 업로드/파싱
    │       └── analysis/
    │           └── [id]/
    │               └── route.ts   # GET: SWOT 분석 + 추이 데이터
    ├── components/
    │   ├── Charts.tsx             # 5종 차트 컴포넌트
    │   └── SwotCard.tsx           # SWOT 분석 카드 컴포넌트
    └── lib/
        ├── auth.ts                # JWT 인증 유틸
        ├── db.ts                  # SQLite 초기화 + 스키마
        └── excel-parser.ts        # 엑셀 파싱 + DB 저장
```

---

## 6. 전체 소스코드

### 6.1 설정 파일

#### `package.json`
```json
{
  "name": "client-financial-manager",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@tailwindcss/postcss": "^4.2.2",
    "@types/bcryptjs": "^2.4.6",
    "@types/better-sqlite3": "^7.6.13",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/multer": "^2.1.0",
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "bcryptjs": "^3.0.3",
    "better-sqlite3": "^12.8.0",
    "chart.js": "^4.5.1",
    "jsonwebtoken": "^9.0.3",
    "multer": "^2.1.1",
    "next": "^16.2.1",
    "postcss": "^8.5.8",
    "react": "^19.2.4",
    "react-chartjs-2": "^5.3.1",
    "react-dom": "^19.2.4",
    "tailwindcss": "^4.2.2",
    "typescript": "^6.0.2",
    "xlsx": "^0.18.5"
  }
}
```

#### `next.config.ts`
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

#### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### `postcss.config.mjs`
```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

#### `.gitignore`
```
node_modules/
.next/
data/
public/uploads/
*.tsbuildinfo
next-env.d.ts
```

---

### 6.2 프론트엔드 페이지

#### `src/app/globals.css`
```css
@import "tailwindcss";
```

#### `src/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "고객 재무관리 시스템",
  description: "고객별 재무상태를 관리하고 분석하는 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-gray-50 min-h-screen text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

#### `src/app/page.tsx` (로그인)
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push(`/customer/${data.customerId}`);
      }
    } catch {
      setError("서버 연결에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white rounded-2xl shadow-xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">재무관리 시스템</h1>
          <p className="text-gray-500 mt-2">고객 재무상태 관리 및 분석</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="아이디를 입력하세요"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          관리자: admin / admin1234
        </p>
      </div>
    </div>
  );
}
```

#### `src/app/not-found.tsx`
```tsx
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-gray-500 mb-6">페이지를 찾을 수 없습니다.</p>
        <a href="/" className="text-blue-600 hover:text-blue-800">로그인 페이지로</a>
      </div>
    </div>
  );
}
```

#### `src/app/admin/page.tsx` (관리자 대시보드)
```tsx
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
```

#### `src/app/customer/[id]/page.tsx` (고객 상세)
```tsx
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
```

---

### 6.3 컴포넌트

#### `src/components/Charts.tsx`
```tsx
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
```

#### `src/components/SwotCard.tsx`
```tsx
"use client";

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

const sections = [
  { key: "strengths" as const, title: "S - 강점 (Strengths)", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-800", icon: "+" },
  { key: "weaknesses" as const, title: "W - 약점 (Weaknesses)", bg: "bg-red-50", border: "border-red-200", text: "text-red-800", icon: "-" },
  { key: "opportunities" as const, title: "O - 기회 (Opportunities)", bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: "^" },
  { key: "threats" as const, title: "T - 위협 (Threats)", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-800", icon: "!" },
];

export function SwotCard({ swot }: { swot: SwotData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sections.map(({ key, title, bg, border, text, icon }) => (
        <div key={key} className={`${bg} ${border} border rounded-xl p-5`}>
          <h3 className={`font-bold ${text} mb-3 text-lg`}>{title}</h3>
          <ul className="space-y-2">
            {swot[key].map((item, i) => (
              <li key={i} className={`${text} text-sm flex items-start gap-2`}>
                <span className="font-bold mt-0.5 shrink-0">{icon}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

---

### 6.4 백엔드 라이브러리

#### `src/lib/auth.ts`
```ts
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET || "financial-manager-secret-key-2024";

export interface TokenPayload {
  userId: number;
  username: string;
  role: "admin" | "customer";
  customerId?: number;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(role?: "admin" | "customer"): Promise<TokenPayload> {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  if (role && session.role !== role && session.role !== "admin") throw new Error("Forbidden");
  return session;
}
```

#### `src/lib/db.ts`
```ts
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "financial.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initDb(_db);
  }
  return _db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      customer_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      birth_year INTEGER,
      gender TEXT,
      job TEXT,
      address TEXT,
      email TEXT,
      phone TEXT,
      financial_goal TEXT,
      label TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      snapshot_date TEXT NOT NULL,
      label TEXT,
      salary_self INTEGER DEFAULT 0,
      salary_spouse INTEGER DEFAULT 0,
      other_income INTEGER DEFAULT 0,
      bonus INTEGER DEFAULT 0,
      total_monthly_income INTEGER DEFAULT 0,
      expense_fixed INTEGER DEFAULT 0,
      expense_variable INTEGER DEFAULT 0,
      total_expense INTEGER DEFAULT 0,
      safe_assets INTEGER DEFAULT 0,
      investment_assets INTEGER DEFAULT 0,
      total_financial_assets INTEGER DEFAULT 0,
      real_estate_total INTEGER DEFAULT 0,
      total_debt INTEGER DEFAULT 0,
      monthly_debt_payment INTEGER DEFAULT 0,
      insurance_premium INTEGER DEFAULT 0,
      net_assets INTEGER DEFAULT 0,
      savings_capacity INTEGER DEFAULT 0,
      savings_ratio REAL DEFAULT 0,
      investment_ratio REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS income_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      category TEXT,
      odd_month INTEGER DEFAULT 0,
      even_month INTEGER DEFAULT 0,
      allowance INTEGER DEFAULT 0,
      monthly_avg INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expense_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      category TEXT,
      type TEXT,
      amount INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      asset_type TEXT,
      product_name TEXT,
      deposit_amount INTEGER DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      accumulated INTEGER DEFAULT 0,
      return_rate REAL DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS real_estate (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      usage TEXT,
      property_type TEXT,
      ownership TEXT,
      amount INTEGER DEFAULT 0,
      region TEXT,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      usage TEXT,
      debt_type TEXT,
      repayment_method TEXT,
      period TEXT,
      total_balance INTEGER DEFAULT 0,
      interest_rate REAL DEFAULT 0,
      monthly_payment INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS insurance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_id INTEGER NOT NULL,
      policyholder TEXT,
      insured TEXT,
      product_name TEXT,
      premium INTEGER DEFAULT 0,
      FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
    );
  `);

  // Create default admin if not exists
  const admin = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
  if (!admin) {
    const hash = bcrypt.hashSync("admin1234", 10);
    db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hash, "admin");
  }
}
```

#### `src/lib/excel-parser.ts`
```ts
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
```

---

### 6.5 API Routes

#### `src/app/api/auth/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as {
    id: number; username: string; password: string; role: string; customer_id: number | null;
  } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    role: user.role as "admin" | "customer",
    customerId: user.customer_id ?? undefined,
  });

  const res = NextResponse.json({
    role: user.role,
    customerId: user.customer_id,
    username: user.username,
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("token");
  return res;
}
```

#### `src/app/api/auth/me/route.ts`
```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(session);
}
```

#### `src/app/api/customers/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const search = req.nextUrl.searchParams.get("q") || "";

  let customers;
  if (session.role === "admin") {
    if (search) {
      customers = db.prepare("SELECT * FROM customers WHERE name LIKE ? OR label LIKE ? ORDER BY name").all(`%${search}%`, `%${search}%`);
    } else {
      customers = db.prepare("SELECT * FROM customers ORDER BY name").all();
    }
  } else {
    customers = db.prepare("SELECT * FROM customers WHERE id = ?").all(session.customerId);
  }

  return NextResponse.json(customers);
}
```

#### `src/app/api/customers/[id]/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customerId = parseInt(id);

  if (session.role !== "admin" && session.customerId !== customerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getDb();
  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId);
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const snapshots = db.prepare("SELECT * FROM snapshots WHERE customer_id = ? ORDER BY snapshot_date DESC").all(customerId);

  const latestSnapshot = snapshots[0] as { id: number } | undefined;
  let details = null;
  if (latestSnapshot) {
    details = {
      assets: db.prepare("SELECT * FROM assets WHERE snapshot_id = ?").all(latestSnapshot.id),
      expenses: db.prepare("SELECT * FROM expense_details WHERE snapshot_id = ?").all(latestSnapshot.id),
      real_estate: db.prepare("SELECT * FROM real_estate WHERE snapshot_id = ?").all(latestSnapshot.id),
      debts: db.prepare("SELECT * FROM debts WHERE snapshot_id = ?").all(latestSnapshot.id),
      insurance: db.prepare("SELECT * FROM insurance WHERE snapshot_id = ?").all(latestSnapshot.id),
    };
  }

  return NextResponse.json({ customer, snapshots, details });
}
```

#### `src/app/api/upload/route.ts`
```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { parseFinancialExcel, saveToDb } from "@/lib/excel-parser";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string) || "컨설팅";

  if (!file) return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}_${file.name}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, buffer);

  try {
    const parsed = parseFinancialExcel(filePath);
    const result = saveToDb(parsed, label);
    return NextResponse.json({
      success: true,
      customerId: result.customerId,
      snapshotId: result.snapshotId,
      customerName: parsed.customer.name,
      customerLabel: parsed.customer.label,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `파싱 오류: ${message}` }, { status: 500 });
  }
}
```

#### `src/app/api/analysis/[id]/route.ts`
```ts
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
```

---

## 7. 실행 방법

```bash
# 프로젝트 디렉토리로 이동
cd 고객관리

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 브라우저에서 http://localhost:3000 접속
# 관리자 로그인: admin / admin1234
```

## 8. 사용 흐름

1. **관리자 로그인** → admin / admin1234
2. **엑셀 업로드** → 스냅샷 라벨 선택 (컨설팅 전/후 등) → 파일 선택
3. **자동 처리** → 엑셀 파싱 → DB 저장 → 고객 계정 자동 생성 (초기 PW: 1234)
4. **고객 검색** → 이름/라벨로 검색 → 클릭하면 상세 페이지
5. **고객 로그인** → 라벨(예: 95_여_권태희) / 1234 → 본인 재무 페이지 확인
6. **데이터 축적** → 같은 고객 엑셀 재업로드 시 스냅샷 추가 → 추이 차트 + SWOT 비교 자동 갱신

---

## 9. 향후 개선사항 (TODO)

- [ ] 엑셀 파싱 셀 매핑을 실제 재무제표 양식에 정확히 맞추기 (현재 예시 기반)
- [ ] 투자 포트폴리오 PDF/PNG 파일 업로드 및 뷰어
- [ ] 고객 비밀번호 변경 기능
- [ ] 관리자의 고객 계정 관리 (비밀번호 초기화, 삭제 등)
- [ ] 배포 (Vercel, AWS 등) - SQLite를 PostgreSQL로 전환 필요
- [ ] 모바일 반응형 최적화
- [ ] 다크모드 지원
