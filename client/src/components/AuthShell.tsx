import type { ReactNode } from 'react';
import { BookOpen, MessageCircle, Bookmark } from 'lucide-react';
import BrandMark from './BrandMark';
import { ThemeToggle } from './ui';

/** Two-column layout shared by the sign-in / sign-up / password pages. */
export default function AuthShell({ title, subtitle, children, aside = true }: {
  title: string; subtitle?: string; children: ReactNode; aside?: boolean;
}) {
  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col px-4 sm:px-8 py-6">
        <div className="flex items-center justify-between">
          <BrandMark />
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-md animate-fade-in-up">
            <h1 className="text-3xl font-bold text-ink-50 tracking-tight">{title}</h1>
            {subtitle && <p className="text-ink-500 mt-2 mb-8">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>

      {aside && (
        <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-gradient-to-br from-primary-600 via-sky-600 to-indigo-700 text-white">
          <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-32 -left-16 w-[24rem] h-[24rem] rounded-full bg-indigo-400/30 blur-3xl" aria-hidden="true" />
          <div className="relative max-w-md p-12">
            <h2 className="text-3xl font-bold leading-tight">Mỗi câu chuyện đều đáng được kể</h2>
            <p className="mt-4 text-white/80 text-lg leading-relaxed">Giữa thế giới đổ nát, những câu chuyện giúp ta giữ lại nhân tính.</p>
            <ul className="mt-10 space-y-4 text-white/90">
              <li className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><BookOpen className="w-5 h-5" /></span> Đọc truyện chữ và truyện tranh miễn phí</li>
              <li className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Bookmark className="w-5 h-5" /></span> Lưu truyện yêu thích, nhận thông báo chương mới</li>
              <li className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span> Bình luận và đánh giá cùng cộng đồng</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
