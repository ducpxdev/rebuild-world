import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StoryCard from '../components/StoryCard';
import { EmptyState, Alert } from '../components/ui';
import api from '../lib/api';
import { apiErrorMessage } from '../lib/i18n';
import { formatDate, formatCompact, formatNumber } from '../lib/format';
import {
  User, Calendar, BookOpen, Users, UserPlus, UserCheck, UserMinus, Shield, Camera, X, Pencil, Check,
  AlertTriangle, Eye, Star, Share2, LayoutDashboard, PenSquare, Plus, Loader2,
} from 'lucide-react';

interface Story {
  id: string; title: string; cover_url?: string; type: 'text' | 'comic';
  genre?: string; views: number; rating_avg?: number; rating_count?: number;
  chapter_count: number; status?: string; updated_at?: number;
}

interface Profile {
  id: string; username: string; avatar_url?: string; bio?: string;
  is_admin?: number; created_at: number; stories: Story[];
  follower_count: number; is_following: boolean;
}

type SortKey = 'updated' | 'views' | 'rating';
type TypeFilter = 'all' | 'text' | 'comic';

const MAX_AVATAR_SIZE = 400 * 1024; // 400 kB
const MAX_BIO_LENGTH = 300;
const USERNAME_RULE = /^[a-zA-Z0-9_]{3,30}$/;

const SORT_LABELS: Record<SortKey, string> = {
  updated: 'Mới cập nhật',
  views: 'Xem nhiều nhất',
  rating: 'Đánh giá cao nhất',
};

/** Postgres returns COUNT(*) and some aggregates as strings — normalise once on load. */
function normaliseProfile(raw: Profile): Profile {
  return {
    ...raw,
    follower_count: Number(raw.follower_count) || 0,
    stories: (raw.stories ?? []).map(s => ({
      ...s,
      views: Number(s.views) || 0,
      chapter_count: Number(s.chapter_count) || 0,
      rating_count: Number(s.rating_count) || 0,
      rating_avg: s.rating_avg != null ? Number(s.rating_avg) : undefined,
      updated_at: s.updated_at != null ? Number(s.updated_at) : undefined,
    })),
  };
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [sizeWarning, setSizeWarning] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Username
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  // Bio
  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState('');
  const [savingBio, setSavingBio] = useState(false);

  // Story list controls
  const [sort, setSort] = useState<SortKey>('updated');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFound(false);
    setProfile(null);
    setEditingUsername(false);
    setEditingBio(false);
    setTypeFilter('all');
    api.get(`/users/${username}/profile`).then(r => {
      const p = normaliseProfile(r.data);
      setProfile(p);
      setFollowing(p.is_following);
      setFollowerCount(p.follower_count);
    }).catch(() => setNotFound(true));
  }, [username]);

  const stats = useMemo(() => {
    const stories = profile?.stories ?? [];
    const rated = stories.filter(s => s.rating_count && s.rating_avg);
    const ratingTotal = rated.reduce((sum, s) => sum + (s.rating_count ?? 0), 0);
    const ratingAvg = ratingTotal
      ? rated.reduce((sum, s) => sum + (s.rating_avg ?? 0) * (s.rating_count ?? 0), 0) / ratingTotal
      : 0;
    return {
      stories: stories.length,
      chapters: stories.reduce((sum, s) => sum + s.chapter_count, 0),
      views: stories.reduce((sum, s) => sum + s.views, 0),
      ratingAvg,
      ratingTotal,
      hasText: stories.some(s => s.type === 'text'),
      hasComic: stories.some(s => s.type === 'comic'),
    };
  }, [profile]);

  const visibleStories = useMemo(() => {
    const list = (profile?.stories ?? []).filter(s => typeFilter === 'all' || s.type === typeFilter);
    const sorted = [...list];
    if (sort === 'views') sorted.sort((a, b) => b.views - a.views);
    else if (sort === 'rating') sorted.sort((a, b) => (b.rating_avg ?? 0) - (a.rating_avg ?? 0) || (b.rating_count ?? 0) - (a.rating_count ?? 0));
    // 'updated' keeps the server order (updated_at DESC)
    return sorted;
  }, [profile, sort, typeFilter]);

  // ── Follow ──────────────────────────────────────────────────────
  const toggleFollow = async () => {
    if (followBusy) return;
    setFollowBusy(true);
    try {
      const r = await api.post(`/users/${username}/follow`);
      setFollowing(r.data.following);
      setFollowerCount(c => Math.max(0, c + (r.data.following ? 1 : -1)));
    } catch (err) {
      showToast(apiErrorMessage(err, 'Không thể cập nhật theo dõi'), 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  const shareProfile = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Đã sao chép liên kết trang cá nhân', 'success');
    } catch {
      showToast('Không thể sao chép liên kết', 'error');
    }
  };

  // ── Avatar ──────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again after cancelling still fires onChange
    e.target.value = '';
    if (!file) return;
    setUploadError('');

    if (file.size > MAX_AVATAR_SIZE) {
      setSizeWarning(`Ảnh vượt quá giới hạn 400 kB (ảnh của bạn: ${(file.size / 1024).toFixed(0)} kB). Hãy chọn ảnh nhỏ hơn.`);
      setAvatarPreview(null);
      setAvatarFile(null);
      return;
    }

    setSizeWarning('');
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAvatarCancel = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setSizeWarning('');
    setUploadError('');
  };

  const handleAvatarSave = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    try {
      const res = await api.put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const avatarUrl: string = res.data?.avatar_url ?? avatarPreview ?? '';
      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      if (user) updateUser({ ...user, avatar_url: avatarUrl });
      setAvatarPreview(null);
      setAvatarFile(null);
      showToast('Đã cập nhật ảnh đại diện', 'success');
    } catch (err) {
      setUploadError(apiErrorMessage(err, 'Không thể tải ảnh đại diện lên'));
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Username ────────────────────────────────────────────────────
  const handleUsernameEdit = () => {
    setNewUsername(profile?.username ?? '');
    setUsernameError('');
    setEditingUsername(true);
  };

  const handleUsernameCancel = () => {
    setEditingUsername(false);
    setUsernameError('');
  };

  const handleUsernameSave = async () => {
    const next = newUsername.trim();
    if (!profile || next === profile.username) { handleUsernameCancel(); return; }
    if (!USERNAME_RULE.test(next)) {
      setUsernameError('Tên người dùng cần 3–30 ký tự, chỉ gồm chữ cái không dấu, số và dấu gạch dưới.');
      return;
    }
    setSavingUsername(true);
    setUsernameError('');
    try {
      const res = await api.patch('/users/me/username', { username: next });
      const updated = res.data.username as string;
      setProfile(prev => prev ? { ...prev, username: updated } : prev);
      if (user) updateUser({ ...user, username: updated });
      showToast('Đã đổi tên người dùng!', 'success');
      setEditingUsername(false);
      navigate(`/user/${updated}`, { replace: true });
    } catch (err) {
      setUsernameError(apiErrorMessage(err, 'Không thể đổi tên người dùng'));
    } finally {
      setSavingUsername(false);
    }
  };

  // ── Bio ─────────────────────────────────────────────────────────
  const handleBioEdit = () => {
    setBioDraft(profile?.bio ?? '');
    setEditingBio(true);
  };

  const handleBioSave = async () => {
    const next = bioDraft.trim();
    setSavingBio(true);
    try {
      await api.put('/users/me', { bio: next });
      setProfile(prev => prev ? { ...prev, bio: next } : prev);
      if (user) updateUser({ ...user, bio: next });
      setEditingBio(false);
      showToast('Đã cập nhật phần giới thiệu', 'success');
    } catch (err) {
      showToast(apiErrorMessage(err, 'Không thể cập nhật phần giới thiệu'), 'error');
    } finally {
      setSavingBio(false);
    }
  };

  if (notFound) return (
    <div className="max-w-lg mx-auto px-4 py-20">
      <EmptyState
        icon={<User className="w-7 h-7" />}
        title="Không tìm thấy người dùng"
        description="Tài khoản này không tồn tại hoặc đã đổi tên."
        action={<Link to="/browse" className="btn btn-primary">Khám phá truyện</Link>}
      />
    </div>
  );

  if (!profile) return <ProfileSkeleton />;

  const isOwner = !!user && user.id === profile.id;
  const isAdmin = !!profile.is_admin;
  const avatarSrc = avatarPreview ?? profile.avatar_url;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in-up">
      {/* ── Profile header ─────────────────────────────────────── */}
      <section className="card overflow-hidden mb-8" aria-labelledby="profile-name">
        <div className={`profile-banner h-32 sm:h-44 ${isAdmin ? 'profile-banner--admin' : ''}`} aria-hidden="true" />

        <div className="px-5 sm:px-8 pb-6">
          {/* Avatar + actions row */}
          <div className="flex items-start justify-between gap-3">
            <div className="relative -mt-14 sm:-mt-16 shrink-0">
              <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full shadow-[var(--rw-shadow-lg)] ${isAdmin ? 'p-[3px] bg-gradient-to-br from-purple-400 via-fuchsia-400 to-purple-500' : 'p-1 bg-surface'}`}>
                <div className={`w-full h-full rounded-full overflow-hidden bg-surface ${isAdmin ? 'border-[3px] border-surface' : ''}`}>
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={`Ảnh đại diện của ${profile.username}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500 to-indigo-500 text-white text-4xl sm:text-5xl font-bold font-display select-none">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title="Đổi ảnh đại diện"
                    aria-label="Đổi ảnh đại diện"
                    className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] border-[3px] border-surface flex items-center justify-center shadow-md hover:scale-110 hover:bg-[var(--btn-primary-hover)] transition"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} className="sr-only" tabIndex={-1} />
                </>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 sm:pt-4 justify-end">
              <button type="button" onClick={shareProfile} className="btn-icon border border-line" title="Sao chép liên kết" aria-label="Sao chép liên kết trang cá nhân">
                <Share2 className="w-4 h-4" />
              </button>
              {isOwner ? (
                <Link to="/dashboard" className="btn btn-secondary">
                  <LayoutDashboard className="w-4 h-4" /> <span className="hidden sm:inline">Bảng điều khiển</span><span className="sm:hidden">Quản lý</span>
                </Link>
              ) : user ? (
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followBusy}
                  aria-pressed={following}
                  className={`btn group sm:min-w-[9.5rem] ${following ? 'btn-secondary hover:!text-red-400 hover:!border-red-500/40 hover:!bg-red-500/5' : 'btn-primary'}`}
                >
                  {followBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : following ? (
                    <>
                      <UserCheck className="w-4 h-4 group-hover:hidden" />
                      <UserMinus className="w-4 h-4 hidden group-hover:block" />
                      <span className="group-hover:hidden">Đang theo dõi</span>
                      <span className="hidden group-hover:inline">Bỏ theo dõi</span>
                    </>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Theo dõi</>
                  )}
                </button>
              ) : (
                <Link to="/login" className="btn btn-primary"><UserPlus className="w-4 h-4" /> Theo dõi</Link>
              )}
            </div>
          </div>

          {/* Pending avatar change */}
          {avatarPreview && isOwner && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary-500/30 bg-primary-500/5 px-4 py-3">
              <Camera className="w-4 h-4 text-primary-300 shrink-0" />
              <p className="text-sm text-ink-300 flex-1 min-w-[12rem]">Xem trước ảnh đại diện mới. Lưu để áp dụng?</p>
              <div className="flex gap-2">
                <button type="button" onClick={handleAvatarCancel} disabled={uploadingAvatar} className="btn btn-secondary btn-sm">Hủy</button>
                <button type="button" onClick={handleAvatarSave} disabled={uploadingAvatar} className="btn btn-primary btn-sm">
                  {uploadingAvatar ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang tải lên…</> : <><Check className="w-4 h-4" /> Lưu ảnh</>}
                </button>
              </div>
            </div>
          )}
          {sizeWarning && (
            <Alert kind="warning" className="mt-4"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {sizeWarning}</Alert>
          )}
          {uploadError && (
            <Alert kind="error" className="mt-4"><X className="w-4 h-4 mt-0.5 shrink-0" /> {uploadError}</Alert>
          )}

          {/* Identity */}
          <div className="mt-4">
            {editingUsername && isOwner ? (
              <div className="max-w-md">
                <label htmlFor="username-input" className="label">Tên người dùng mới</label>
                <div className="flex items-center gap-2">
                  <input
                    id="username-input"
                    type="text"
                    value={newUsername}
                    onChange={e => { setNewUsername(e.target.value); setUsernameError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') handleUsernameSave(); if (e.key === 'Escape') handleUsernameCancel(); }}
                    maxLength={30}
                    autoFocus
                    aria-invalid={!!usernameError}
                    aria-describedby="username-help"
                    className="input font-semibold"
                  />
                  <button type="button" onClick={handleUsernameSave} disabled={savingUsername || !newUsername.trim()} className="btn btn-primary !px-3 shrink-0" aria-label="Lưu tên người dùng">
                    {savingUsername ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={handleUsernameCancel} className="btn btn-secondary !px-3 shrink-0" aria-label="Hủy đổi tên">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {usernameError ? (
                  <p id="username-help" className="mt-1.5 text-xs text-red-400" role="alert">{usernameError}</p>
                ) : (
                  <p id="username-help" className="mt-1.5 text-xs text-ink-500">3–30 ký tự: chữ cái không dấu, số hoặc “_”. Chỉ đổi được 30 ngày một lần.</p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 id="profile-name" className={`text-2xl sm:text-3xl font-bold break-all ${isAdmin ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500' : 'text-ink-50'}`}>
                  {profile.username}
                </h1>
                {isAdmin && <span className="inline-block text-lg" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }} aria-hidden="true">✨</span>}
                {isOwner && (
                  <button type="button" onClick={handleUsernameEdit} title="Đổi tên người dùng" aria-label="Đổi tên người dùng" className="btn-icon !w-8 !h-8">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {isAdmin && (
                  <span className="badge bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    <Shield className="w-3 h-3" /> Quản trị viên
                  </span>
                )}
                {isOwner && <span className="badge bg-ink-900 text-ink-500 font-medium">Bạn</span>}
              </div>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Tham gia {formatDate(profile.created_at)}</span>
              {stats.stories > 0 && (
                <span className="flex items-center gap-1.5"><PenSquare className="w-3.5 h-3.5" /> Tác giả · {stats.chapters} chương</span>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mt-4 max-w-2xl">
            {editingBio && isOwner ? (
              <div>
                <label htmlFor="bio-input" className="sr-only">Giới thiệu</label>
                <textarea
                  id="bio-input"
                  value={bioDraft}
                  onChange={e => setBioDraft(e.target.value.slice(0, MAX_BIO_LENGTH))}
                  onKeyDown={e => { if (e.key === 'Escape') setEditingBio(false); }}
                  rows={3}
                  autoFocus
                  placeholder="Chia sẻ đôi điều về bạn, thể loại bạn yêu thích hay lịch đăng truyện…"
                  className="input resize-y leading-relaxed"
                />
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs mr-auto ${bioDraft.length >= MAX_BIO_LENGTH ? 'text-amber-400' : 'text-ink-500'}`}>
                    {bioDraft.length}/{MAX_BIO_LENGTH}
                  </span>
                  <button type="button" onClick={() => setEditingBio(false)} disabled={savingBio} className="btn btn-secondary btn-sm">Hủy</button>
                  <button type="button" onClick={handleBioSave} disabled={savingBio} className="btn btn-primary btn-sm">
                    {savingBio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lưu
                  </button>
                </div>
              </div>
            ) : profile.bio ? (
              <div className="group/bio relative">
                <p className="text-ink-300 leading-relaxed whitespace-pre-line break-words">{profile.bio}</p>
                {isOwner && (
                  <button type="button" onClick={handleBioEdit} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-primary-300 transition">
                    <Pencil className="w-3 h-3" /> Sửa giới thiệu
                  </button>
                )}
              </div>
            ) : isOwner ? (
              <button
                type="button"
                onClick={handleBioEdit}
                className="w-full sm:w-auto inline-flex items-center gap-2 rounded-xl border border-dashed border-ink-700 px-4 py-2.5 text-sm text-ink-500 hover:text-primary-300 hover:border-primary-500/50 hover:bg-primary-500/5 transition"
              >
                <Plus className="w-4 h-4" /> Thêm vài dòng giới thiệu về bạn
              </button>
            ) : null}
          </div>
        </div>

        {/* Stats strip */}
        <dl className="grid grid-cols-2 sm:grid-cols-4 border-t border-line bg-ink-950/60">
          <StatTile icon={<BookOpen className="w-4 h-4" />} label="Truyện" value={formatNumber(stats.stories)} hint={`${formatNumber(stats.chapters)} chương`} />
          <StatTile icon={<Users className="w-4 h-4" />} label="Người theo dõi" value={formatCompact(followerCount)} hint={followerCount >= 1000 ? formatNumber(followerCount) : undefined} />
          <StatTile icon={<Eye className="w-4 h-4" />} label="Lượt xem" value={formatCompact(stats.views)} hint="Tổng tất cả truyện" />
          <StatTile
            icon={<Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
            label="Đánh giá TB"
            value={stats.ratingTotal ? stats.ratingAvg.toFixed(1) : '—'}
            hint={stats.ratingTotal ? `${formatNumber(stats.ratingTotal)} lượt đánh giá` : 'Chưa có đánh giá'}
          />
        </dl>
      </section>

      {/* ── Stories ───────────────────────────────────────────── */}
      <section aria-labelledby="stories-heading">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <h2 id="stories-heading" className="section-title text-xl">{isOwner ? 'Truyện của bạn' : 'Truyện đã đăng'}</h2>
            {stats.stories > 0 && (
              <span className="badge bg-primary-500/12 text-primary-300 text-xs">{stats.stories}</span>
            )}
          </div>
          {stats.stories > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="story-sort" className="text-sm text-ink-500 hidden sm:block">Sắp xếp</label>
              <select id="story-sort" value={sort} onChange={e => setSort(e.target.value as SortKey)} className="input !w-auto !min-h-9 !py-1.5 text-sm">
                {(Object.keys(SORT_LABELS) as SortKey[]).map(k => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
              </select>
            </div>
          )}
        </div>

        {stats.hasText && stats.hasComic && (
          <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar" role="group" aria-label="Lọc theo loại truyện">
            {([['all', 'Tất cả'], ['text', 'Truyện chữ'], ['comic', 'Truyện tranh']] as const).map(([key, label]) => (
              <button key={key} type="button" className="chip" aria-pressed={typeFilter === key} onClick={() => setTypeFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        )}

        {stats.stories === 0 ? (
          isOwner ? (
            <EmptyState
              icon={<PenSquare className="w-7 h-7" />}
              title="Bạn chưa đăng truyện nào"
              description="Bắt đầu hành trình sáng tác — bộ truyện đầu tiên sẽ xuất hiện tại đây để độc giả khám phá."
              action={<Link to="/create" className="btn btn-primary"><Plus className="w-4 h-4" /> Đăng truyện đầu tiên</Link>}
            />
          ) : (
            <EmptyState
              icon={<BookOpen className="w-7 h-7" />}
              title="Chưa có truyện nào"
              description={`${profile.username} chưa đăng truyện nào. Theo dõi để nhận thông báo khi có truyện mới!`}
            />
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visibleStories.map(s => (
              <StoryCard key={s.id} {...s} author_name={profile.username} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="px-5 sm:px-6 py-4 border-line [&:nth-child(odd)]:border-r sm:border-r sm:last:border-r-0 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-500">
        <span className="text-ink-500">{icon}</span>{label}
      </dt>
      <dd className="mt-1">
        <span className="block text-2xl font-bold font-display text-ink-100 tabular-nums">{value}</span>
        {hint && <span className="block text-xs text-ink-500 mt-0.5 truncate">{hint}</span>}
      </dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8" aria-busy="true" aria-label="Đang tải trang cá nhân">
      <div className="card overflow-hidden mb-8">
        <div className="skeleton !rounded-none h-32 sm:h-44" />
        <div className="px-5 sm:px-8 pb-6">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-surface bg-ink-900 -mt-14 sm:-mt-16" />
          <div className="skeleton h-8 w-48 mt-4" />
          <div className="skeleton h-4 w-40 mt-3" />
          <div className="skeleton h-4 w-full max-w-lg mt-5" />
          <div className="skeleton h-4 w-2/3 max-w-md mt-2" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-line">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="px-6 py-4"><div className="skeleton h-3 w-20" /><div className="skeleton h-7 w-14 mt-2" /></div>
          ))}
        </div>
      </div>
      <div className="skeleton h-6 w-40 mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden border border-line bg-surface">
            <div className="skeleton !rounded-none aspect-[3/4]" />
            <div className="p-3"><div className="skeleton h-4 w-full" /><div className="skeleton h-3 w-1/2 mt-2" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
