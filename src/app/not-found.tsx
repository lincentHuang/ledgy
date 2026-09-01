import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4 text-center">
      <h2 className="text-2xl font-bold mb-2">404 - 找不到頁面</h2>
      <p className="text-sm text-slate-400 mb-6">您所尋找的頁面不存在或已被移除。</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md"
      >
        返回首頁
      </Link>
    </div>
  );
}
