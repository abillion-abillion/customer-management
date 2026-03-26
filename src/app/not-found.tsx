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
