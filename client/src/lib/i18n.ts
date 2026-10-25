import axios from 'axios';

/**
 * Vietnamese labels for values stored in English (genres, statuses, types) and
 * translations of the messages the API returns. Stored values are never changed —
 * only how they are displayed.
 */

export const GENRES = ['Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Adventure', 'Mystery', 'Comedy', 'Drama', 'Slice of Life', 'Action'];

const GENRE_LABELS: Record<string, string> = {
  'fantasy': 'Kỳ ảo',
  'sci-fi': 'Khoa học viễn tưởng',
  'romance': 'Lãng mạn',
  'horror': 'Kinh dị',
  'adventure': 'Phiêu lưu',
  'mystery': 'Bí ẩn',
  'comedy': 'Hài hước',
  'drama': 'Chính kịch',
  'slice of life': 'Đời thường',
  'action': 'Hành động',
};

export const genreLabel = (genre: string) => GENRE_LABELS[genre.trim().toLowerCase()] ?? genre;

export const STATUS_LABELS: Record<string, string> = {
  ongoing: 'Đang tiến hành',
  completed: 'Hoàn thành',
  hiatus: 'Tạm ngưng',
};
export const statusLabel = (status?: string) => (status && STATUS_LABELS[status]) || status || '';

export const typeLabel = (type?: string) => (type === 'comic' ? 'Truyện tranh' : 'Truyện chữ');

/** Category tags keep their well-known names (Light Novel, Web Novel, Manga). */
export const TAG_CATEGORIES = {
  light_novel: { label: 'Light Novel', color: 'red', badgeColor: 'bg-rose-500 text-white' },
  web_novel: { label: 'Web Novel', color: 'yellow', badgeColor: 'bg-amber-400 text-black' },
  manga: { label: 'Manga', color: 'orange', badgeColor: 'bg-orange-500 text-white' },
} as const;

export const getCategoryBadge = (tags?: string) => {
  if (!tags) return null;
  const firstTag = tags.split(',').map(t => t.trim().toLowerCase().replace(/\s+/g, '_'))[0];
  return TAG_CATEGORIES[firstTag as keyof typeof TAG_CATEGORIES] || null;
};

// ── API messages ────────────────────────────────────────────────────

const MESSAGES: Record<string, string> = {
  'Story not found': 'Không tìm thấy truyện',
  'Comment not found': 'Không tìm thấy bình luận',
  'User not found': 'Không tìm thấy người dùng',
  'Unauthorized': 'Bạn không có quyền thực hiện thao tác này',
  'Forbidden': 'Bạn không có quyền truy cập',
  'Not authenticated': 'Bạn chưa đăng nhập',
  'Invalid chapter number': 'Số chương không hợp lệ',
  'Chapter not found': 'Không tìm thấy chương',
  'You have been banned from commenting and reviewing': 'Bạn đã bị cấm bình luận và đánh giá',
  'You have been banned from commenting': 'Bạn đã bị cấm bình luận',
  'Reply not found': 'Không tìm thấy phản hồi',
  'Reply cannot be empty': 'Phản hồi không được để trống',
  'Comment cannot be empty': 'Bình luận không được để trống',
  'Password must be at least 8 characters': 'Mật khẩu phải có ít nhất 8 ký tự',
  'Only story author can unpin comments': 'Chỉ tác giả truyện mới có thể bỏ ghim bình luận',
  'Only story author can pin comments': 'Chỉ tác giả truyện mới có thể ghim bình luận',
  'Invalid credentials': 'Email hoặc mật khẩu không đúng',
  'Already liked this comment': 'Bạn đã thích bình luận này',
  'Chapter title is required': 'Vui lòng nhập tiêu đề chương',
  'You are posting comments too quickly. Please wait a moment before posting again.': 'Bạn đang bình luận quá nhanh. Vui lòng chờ một chút rồi thử lại.',
  'Volume number already exists for this story': 'Số tập này đã tồn tại trong truyện',
  'Volume not found': 'Không tìm thấy tập',
  'Verification token has expired': 'Liên kết xác minh đã hết hạn',
  'Verification failed': 'Xác minh thất bại',
  'User not found or already verified': 'Không tìm thấy người dùng hoặc tài khoản đã được xác minh',
  'Username must be between 3 and 30 characters': 'Tên người dùng phải dài từ 3 đến 30 ký tự',
  'Username must be 3-30 alphanumeric characters or underscores': 'Tên người dùng gồm 3–30 ký tự chữ, số hoặc dấu gạch dưới',
  'Username may only contain letters, numbers, and underscores': 'Tên người dùng chỉ được chứa chữ, số và dấu gạch dưới',
  'Username is required': 'Vui lòng nhập tên người dùng',
  'Username is already taken': 'Tên người dùng đã được sử dụng',
  'Type must be text or comic': 'Loại truyện phải là truyện chữ hoặc truyện tranh',
  'Too many requests. Please try again later.': 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  'Token required': 'Thiếu mã xác thực',
  'Token and password required': 'Thiếu mã xác thực hoặc mật khẩu',
  'Title and type are required': 'Vui lòng nhập tiêu đề và chọn loại truyện',
  'This chapter already exists': 'Chương này đã tồn tại',
  'Some chapters not found or do not belong to this volume': 'Một số chương không tồn tại hoặc không thuộc tập này',
  'Review not found': 'Không tìm thấy đánh giá',
  'Review must be longer than 8 characters': 'Đánh giá phải dài hơn 8 ký tự',
  'Reset failed': 'Đặt lại mật khẩu thất bại',
  'Request failed': 'Yêu cầu thất bại',
  'Registration failed': 'Đăng ký thất bại',
  'Rating must be an integer between 1 and 5': 'Điểm đánh giá phải từ 1 đến 5',
  'Only the story author or admin can create chapters': 'Chỉ tác giả hoặc quản trị viên mới có thể thêm chương',
  'Only the author or admin can update notes': 'Chỉ tác giả hoặc quản trị viên mới có thể sửa ghi chú',
  'Notification not found': 'Không tìm thấy thông báo',
  'Login failed': 'Đăng nhập thất bại',
  'Invalid story or volume reference': 'Truyện hoặc tập không hợp lệ',
  'Invalid or expired verification token': 'Liên kết xác minh không hợp lệ hoặc đã hết hạn',
  'Invalid or expired reset token': 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn',
  'Invalid chapterIds array': 'Danh sách chương không hợp lệ',
  'Image not found': 'Không tìm thấy hình ảnh',
  'Failed to upload files': 'Tải tệp lên thất bại',
  'Failed to upload file': 'Tải tệp lên thất bại',
  'Account created. You can now log in.': 'Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.',
  'Email verified successfully. You can now log in.': 'Xác minh email thành công. Bạn có thể đăng nhập ngay.',
  'Verification email resent': 'Đã gửi lại email xác minh',
  'If that email exists, a reset link has been sent.': 'Nếu email tồn tại, chúng tôi đã gửi liên kết đặt lại mật khẩu.',
  'Password reset successful. You can now log in.': 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
  'Logged out successfully': 'Đã đăng xuất',
  'All notifications marked as read': 'Đã đánh dấu tất cả là đã đọc',
  'Notification marked as read': 'Đã đánh dấu là đã đọc',
  'Chapter created': 'Đã tạo chương',
  'Chapter updated': 'Đã cập nhật chương',
  'Chapter deleted': 'Đã xóa chương',
  'Comment deleted': 'Đã xóa bình luận',
  'Chapters reordered successfully': 'Đã sắp xếp lại các chương',
  'Story created': 'Đã tạo truyện',
  'Story updated': 'Đã cập nhật truyện',
};

const UNITS: Record<string, string> = { second: 'giây', seconds: 'giây', minute: 'phút', minutes: 'phút' };

const PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^Too many (login|registration|password reset|upload|verification) attempts\. Please try again in (\d+) (seconds|minutes)\.$/,
    m => `Bạn đã thử quá nhiều lần. Vui lòng thử lại sau ${m[2]} ${UNITS[m[3]]}.`],
  [/^Too many .* requests\.(?: Please slow down\.)?$/, () => 'Bạn thao tác quá nhanh. Vui lòng chậm lại.'],
  [/^Too many .*, please try again after (\d+) (minutes|hour)\.?$/,
    m => `Quá nhiều yêu cầu. Vui lòng thử lại sau ${m[1]} ${m[2] === 'hour' ? 'giờ' : 'phút'}.`],
  [/^You must wait (\d+) more day\(s\) before changing your username again$/,
    m => `Bạn cần chờ thêm ${m[1]} ngày nữa mới có thể đổi tên người dùng.`],
  [/^Failed to (.+)$/, () => 'Thao tác thất bại. Vui lòng thử lại.'],
];

/** Translate a message returned by the API; unknown messages are returned unchanged. */
export function translateMessage(message: string): string {
  if (!message) return message;
  const exact = MESSAGES[message.trim()];
  if (exact) return exact;
  for (const [re, fn] of PATTERNS) {
    const m = message.trim().match(re);
    if (m) return fn(m);
  }
  return message;
}

/** Vietnamese error text for a failed request, with a fallback for network errors. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.error;
    if (typeof msg === 'string' && msg) return translateMessage(msg);
    if (!error.response) return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  return fallback;
}

// ── Stored notification text ────────────────────────────────────────
// Notification titles/messages are stored in English; render them in Vietnamese
// when they match one of the known server templates.

const NOTIFICATION_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^New chapter in "(.*)"$/s, m => `Chương mới trong “${m[1]}”`],
  [/^The series '(.*)' has been updated with chapter '(.*)'$/s, m => `Truyện “${m[1]}” vừa cập nhật chương “${m[2]}”`],
  [/^New story: (.*)$/s, m => `Truyện mới: ${m[1]}`],
  [/^(.*) published a new story!$/s, m => `${m[1]} vừa đăng một truyện mới!`],
  [/^New comment on your story$/, () => 'Bình luận mới về truyện của bạn'],
  [/^New comment on a chapter$/, () => 'Bình luận mới ở một chương'],
  [/^New reply to your comment$/, () => 'Phản hồi mới cho bình luận của bạn'],
  [/^(.*) replied to your comment on "(.*)"$/s, m => `${m[1]} đã trả lời bình luận của bạn trong “${m[2]}”`],
  [/^(.*) commented on Chapter (\d+) of "(.*)"$/s, m => `${m[1]} đã bình luận ở chương ${m[2]} của “${m[3]}”`],
  [/^(.*) commented on "your story"$/s, m => `${m[1]} đã bình luận về truyện của bạn`],
  [/^(.*) commented on "(.*)"$/s, m => `${m[1]} đã bình luận về “${m[2]}”`],
];

export function translateNotificationText(text: string): string {
  if (!text) return text;
  for (const [re, fn] of NOTIFICATION_PATTERNS) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return text;
}
