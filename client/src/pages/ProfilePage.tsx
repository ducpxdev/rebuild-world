import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StoryCard from '../components/StoryCard';
import api from '../lib/api';
import { User, Calendar, BookOpen, Users, UserPlus, UserCheck, Shield, Upload, X, Pencil, Check } from 'lucide-react';

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
  const [profile, setProfile] = useState<Profile | null>(null);
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
  const [usernameSuccess, setUsernameSuccess] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    api.get(`/users/${username}/profile`).then(r => {
      setProfile(r.data);
      setFollowing(r.data.is_following);
      setFollowerCount(r.data.follower_count);
    });
  }, [username]);

  const toggleFollow = async () => {
    const r = await api.post(`/users/${username}/follow`);
    setFollowing(r.data.following);
    setFollowerCount(c => c + (r.data.following ? 1 : -1));
  };

  const MAX_FILE_SIZE = 400 * 1024; // 400kB

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      setSizeWarning(`File size exceeds 400 kB limit. Your file is ${(file.size / 1024).toFixed(2)} kB.`);
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
    } catch (err) {
      const error = err as { response?: { data?: { error: string } } };
      setUploadError(error.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUsernameEdit = () => {
    setNewUsername(profile?.username ?? '');
    setUsernameError('');
    setUsernameSuccess('');
    setEditingUsername(true);
  };

  const handleUsernameCancel = () => {
    setEditingUsername(false);
    setUsernameError('');
    setUsernameSuccess('');
  };

  const handleUsernameSave = async () => {
    if (!newUsername.trim()) return;
    setSavingUsername(true);
    setUsernameError('');
    setUsernameSuccess('');
    try {
      const res = await api.patch('/users/me/username', { username: newUsername.trim() });
      const updated = res.data.username as string;
      setProfile(prev => prev ? { ...prev, username: updated } : null);
      updateUser(user ? { ...user, username: updated } : user!);
      setUsernameSuccess('Username updated successfully!');
      setEditingUsername(false);
      // Navigate to the new profile URL so the URL stays in sync
      navigate(`/profile/${updated}`, { replace: true });
    } catch (err) {
      const error = err as { response?: { data?: { error: string; remaining_days?: number } } };
      setUsernameError(error.response?.data?.error || 'Failed to update username');
    } finally {
      setSavingUsername(false);
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in-up">
      {/* Profile header */}
      <div className="bg-[#12121e] rounded-xl border border-slate-800/60 overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 relative">
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        </div>
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end gap-4 mb-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-xl bg-[#12121e] border-4 border-[#12121e] shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-slate-800">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-600" />
                )}
              </div>
              {user && user.id === profile.id && (
                <label className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <Upload className="w-5 h-5 text-white" />
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              )}
            </div>
            {avatarPreview && user && user.id === profile.id && (
              <div className="flex flex-col gap-2">
                <button onClick={handleAvatarSave}
                  disabled={uploadingAvatar}
                  className="px-3 py-1 text-sm bg-cyan-500 text-black font-bold rounded hover:bg-cyan-400 disabled:opacity-50 transition">
                  {uploadingAvatar ? 'Uploading...' : 'Save'}
                </button>
                <button onClick={handleAvatarCancel}
                  className="px-3 py-1 text-sm bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition">
                  Cancel
                </button>
              </div>
            )}
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                {editingUsername && user && user.id === profile.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUsernameSave(); if (e.key === 'Escape') handleUsernameCancel(); }}
                      maxLength={30}
                      autoFocus
                      className="px-2 py-1 text-lg font-bold bg-[#1a1a2e] border border-cyan-500/50 rounded text-slate-100 focus:outline-none focus:border-cyan-400 font-['Rajdhani'] tracking-wide"
                    />
                    <button onClick={handleUsernameSave} disabled={savingUsername}
                      className="p-1.5 rounded bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 transition">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={handleUsernameCancel}
                      className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className={`text-2xl font-bold font-['Rajdhani'] tracking-wide ${
                      profile.is_admin ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-purple-300 to-purple-500 animate-pulse' : 'text-slate-100'
                    }`}>
                      {profile.username}
                      {profile.is_admin && (
                        <span className="inline-block ml-2 text-lg animate-bounce" style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}>✨</span>
                      )}
                    </h1>
                    {user && user.id === profile.id && (
                      <button onClick={handleUsernameEdit} title="Change username"
                        className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
                {profile.is_admin ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-purple-500/20 text-purple-300 text-xs font-semibold rounded border border-purple-500/30">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                ) : null}
              </div>
              {usernameError && (
                <p className="mt-1 text-xs text-red-400">{usernameError}</p>
              )}
              {usernameSuccess && (
                <p className="mt-1 text-xs text-cyan-400">{usernameSuccess}</p>
              )}
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Joined {new Date(profile.created_at * 1000).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{profile.stories.length} stories</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{followerCount} followers</span>
              </div>
            </div>
            {/* Follow button */}
            {user && user.id !== profile.id && (
              <button onClick={toggleFollow}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition shrink-0 ${
                  following
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                    : 'bg-cyan-500 text-black font-bold hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                }`}>
                {following ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
              </button>
            )}
          </div>
          {sizeWarning && (
            <div className="mb-3 p-3 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-lg text-sm flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>{sizeWarning}</span>
            </div>
          )}
          {uploadError && (
            <div className="mb-3 p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm flex items-start gap-2">
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
          {profile.bio && <p className="text-slate-400 max-w-2xl">{profile.bio}</p>}
        </div>
      </div>

      {/* Stories */}
      <h2 className="text-xl font-bold text-slate-100 mb-4 font-['Rajdhani'] tracking-wide">Published Stories</h2>
      {profile.stories.length === 0 ? (
        <p className="text-center text-slate-600 py-12">No published stories yet.</p>
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
