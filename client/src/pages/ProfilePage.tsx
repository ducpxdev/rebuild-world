import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StoryCard from '../components/StoryCard';
import api from '../lib/api';
import { User, Calendar, BookOpen, Users, UserPlus, UserCheck, Shield } from 'lucide-react';

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
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

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
            <div className="w-24 h-24 rounded-xl bg-[#12121e] border-4 border-[#12121e] shadow-lg flex items-center justify-center overflow-hidden ring-2 ring-slate-800">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-slate-600" />
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide">{profile.username}</h1>
                {profile.is_admin ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 text-xs font-semibold rounded border border-cyan-500/20">
                    <Shield className="w-3 h-3" /> Author
                  </span>
                ) : null}
              </div>
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
