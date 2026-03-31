# customer-management

## 역할
JW Financial 고객 포털
고객 자기 등록, 자산 현황 조회, 어드민 관리 기능

## 브랜치
- 메인: main (확인 필요: `git branch -a`)

## 기술 스택
- Next.js (React)
- Supabase (DB + Auth)
- GitHub Pages or Vercel 배포 (확인 필요)

## 주요 기능
- 어드민 로그인
- Excel 업로드 → 고객 데이터 반영
- 고객 자기 등록

## 로컬 실행
```bash
npm install
npm run dev
# → http://localhost:3000
```

## 환경변수 (.env.local)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
※ .env.local은 git에 올리지 않음. 직접 설정 필요
