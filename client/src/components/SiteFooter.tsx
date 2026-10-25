import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export default function SiteFooter() {
  return (
    <footer data-site-nav className="mt-16 border-t border-line bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid gap-8 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <BrandMark />
          <p className="mt-3 text-sm text-ink-500 max-w-sm leading-relaxed">
            Thư viện truyện chữ và truyện tranh Rebuild World bằng tiếng Việt — đọc thoải mái, theo dõi tiến độ và thảo luận cùng cộng đồng.
          </p>
        </div>
        <nav aria-label="Khám phá">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">Khám phá</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/browse" className="text-ink-400 hover:text-primary-400 transition">Tất cả truyện</Link></li>
            <li><Link to="/browse?sort=popular" className="text-ink-400 hover:text-primary-400 transition">Xem nhiều nhất</Link></li>
            <li><Link to="/browse?sort=rated" className="text-ink-400 hover:text-primary-400 transition">Đánh giá cao</Link></li>
          </ul>
        </nav>
        <nav aria-label="Truyện theo loại">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500 mb-3">Thể loại</h2>
          <ul className="space-y-2 text-sm">
            <li><Link to="/browse?type=text" className="text-ink-400 hover:text-primary-400 transition">Truyện chữ</Link></li>
            <li><Link to="/browse?type=comic" className="text-ink-400 hover:text-primary-400 transition">Truyện tranh</Link></li>
            <li><Link to="/browse?sort=latest" className="text-ink-400 hover:text-primary-400 transition">Mới cập nhật</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-ink-500">
          &copy; {new Date().getFullYear()} Rebuild World. Những câu chuyện giữa đống đổ nát luôn đáng để đọc.
        </p>
      </div>
    </footer>
  );
}
