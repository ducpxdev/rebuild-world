import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StoryCard from '../components/StoryCard';
import { PageLoader, EmptyState, Alert } from '../components/ui';
import api from '../lib/api';
import { apiErrorMessage } from '../lib/i18n';
import { formatDate } from '../lib/format';
import { User, Calendar, BookOpen, Users, UserPlus, UserCheck, Shield, Camera, X, Pencil, Check, AlertTriangle } from 'lucide-react';

interface Story {
  id: string; title: string; cover_url?: string; type: 'text' | 'comic';
  genre?: string; views: number; rating_avg?: number; rating_count?: number;
  chapter_count: number; status?: string;
}

interface Profile {
  id: string; username: string; avatar_url?: string; bio?: string;
  is_admin?: number; created_at: number; stories: Story[];
  follower_count: number; is_following: boolean;
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [sizeWarning, setSizeWarning] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Username change state
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotFound(false);
    api.get(`/users/${username}/profile`).then(r => {
      setProfile(r.data);
      setFollowing(r.data.is_following);
      setFollowerCount(r.data.follower_count);
    }).catch(() => setNotFound(true));
  }, [username]);

  const toggleFollow = async () => {
    try {
      const r = await api.post(`/users/${username}/follow`);
      setFollowing(r.data.following);
      setFollowerCount(c => c + (r.data.following ? 1 : -1));
    } catch (err) {
      showToast(apiErrorMessage(err, 'Không thể cập nhật theo dõi'), 'error');
    }
  };

  const MAX_FILE_SIZE = 400 * 1024; // 400kB

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setSizeWarning(`Ảnh vượt quá giới hạn 400 kB (ảnh của bạn: ${(file.size / 1024).toFixed(2)} kB).`);
      setAvatarPreview(null);
      setAvatarFile(null);
      return;
    }

    setSizeWarning('');
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarSave = async () => {
    if (!avatarFile) return;
    await uploadAvatar(avatarFile);
  };

  const handleAvatarCancel = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    setSizeWarning('');
  };

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true);
    setUploadError('');

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      await api.put('/users/me', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfile(prev => prev ? { ...prev, avatar_url: URL.createObjectURL(file) } : null);
      setAvatarPreview(null);
      showToast('Đã cập nhật ảnh đại diện', 'success');
    } catch (err) {
      setUploadError(apiErrorMessage(err, 'Không thể tải ảnh đại diện lên'));
    } finally {
      setUploadingAvatar(false);
    }
  };

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
    if (!newUsername.trim()) return;
    setSavingUsername(true);
    setUsernameError('');
    try {
      const res = await api.patch('/users/me/username', { username: newUsername.trim() });
      const updated = res.data.username as string;
      setProfile(prev => prev ? { ...prev, username: updated } : null);
      updateUser(user ? { ...user, username: updated } : user!);
      showToast('Đã đổi tên người dùng!', 'success');
      setEditingUsername(false);
      // Navigate to the new profile URL so the URL stays in sync
      navigate(`/user/${updated}`, { replace: true });
    } catch (err) {
      setUsernameError(apiErrorMessage(err, 'Không thể đổi tên người dùng'));
    } finally {
      setSavingUsername(false);
    }
  };

  if (notFound) return (
    <div className="max-w-lg mx-auto px-4 py-20">
      <EmptyState icon={<User className="w-7 h-7" />} title="Không tìm thấy người dùng" description="Tài khoản này không tồn tại hoặc đã đổi tên." />
    </div>
  );

  if (!profile) return <PageLoader />;

  const isOwner = !!user && user.id === profile.id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in-up">
      {/* Profile header */}
      <div className="card overflow-hidden mb-8">
        <div className="h-28 sm:h-36 bg-gradient-to-r from-primary-500/40 via-sky-400/30 to-indigo-500/40" />
        <div className="px-5 sm:px-6 pb-6 -mt-12">
          <div className="flex flex-wrap items-end gap-4 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-surface shadow-lg flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-ink-500" />
                )}
              </div>
              {isOwner && (
                <label className="absolute inset-1 rounded-xl bg-black/45 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition cursor-pointer text-white text-[11px] font-medium" title="Đổi ảnh đại diện">
                  <Camera className="w-5 h-5" /> Đổi ảnh
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
                </label>
              )}
            </div>
            {avatarPreview && isOwner && (
              <div className="flex gap-2 pb-1">
                <button type="button" onClick={handleAvatarSave} disabled={uploadingAvatar} className="btn btn-primary btn-sm">
                  {uploadingAvatar ? 'Đang tải lên…' : 'Lưu ảnh'}
                </button>
                <button type="button" onClick={handleAvatarCancel} className="btn btn-secondary btn-sm">
                  Hủy
                </button>
              </div>
            )}
            <div className="flex-1 min-w-[12rem] pb-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                {editingUsername && isOwner ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUsernameSave(); if (e.key === 'Escape') handleUsernameCancel(); }}
                      maxLength={30}
                      autoFocus
                      aria-label="Tên người dùng mới"
                      className="input !min-h-10 text-lg font-bold font-display"
                    />
                    <button type="button" onClick={handleUsernameSave} disabled={savingUsername} className="btn btn-primary !px-2.5" aria-label="Lưu tên người dùng">
                      <Check className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={handleUsernameCancel} className="btn btn-secondary !px-2.5" aria-label="Hủy">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className={`text-2xl font-bold ${
                      profile.is_admin ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-500' : 'text-ink-50'
                    }`}>
                      {profile.username}
                      {profile.is_admin && (
                        <span className="inline-block ml-2 text-lg" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}>✨</span>
                      )}
                    </h1>
                    {isOwner && (
                      <button type="button" onClick={handleUsernameEdit} title="Đổi tên người dùng" aria-label="Đổi tên người dùng" className="btn-icon !w-8 !h-8">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                {profile.is_admin ? (
                  <span className="badge bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    <Shield className="w-3 h-3" /> Quản trị viên
                  </span>
                ) : null}
              </div>
              {usernameError && <p className="mt-1 text-xs text-red-400">{usernameError}</p>}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500 mt-1.5">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Tham gia {formatDate(profile.created_at)}</span>
                <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{profile.stories.length} truyện</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{followerCount} người theo dõi</span>
              </div>
            </div>
            {/* Follow button */}
            {user && !isOwner && (
              <button type="button" onClick={toggleFollow} aria-pressed={following}
                className={`btn shrink-0 ${following ? 'btn-secondary hover:!text-red-400 hover:!border-red-500/40' : 'btn-primary'}`}>
                {following ? <><UserCheck className="w-4 h-4" /> Đang theo dõi</> : <><UserPlus className="w-4 h-4" /> Theo dõi</>}
              </button>
            )}
          </div>
          {sizeWarning && (
            <Alert kind="warning" className="mb-3"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {sizeWarning}</Alert>
          )}
          {uploadError && (
            <Alert kind="error" className="mb-3"><X className="w-4 h-4 mt-0.5 shrink-0" /> {uploadError}</Alert>
          )}
          {profile.bio && <p className="text-ink-300 max-w-2xl leading-relaxed">{profile.bio}</p>}
        </div>
      </div>

      {/* Stories */}
      <h2 className="section-title text-xl mb-4">Truyện đã đăng</h2>
      {profile.stories.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-7 h-7" />} title="Chưa có truyện nào được đăng" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {profile.stories.map(s => (
            <StoryCard key={s.id} {...s} author_name={profile.username} />
          ))}
        </div>
      )}
    </div>
  );
}
