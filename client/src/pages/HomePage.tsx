import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, ArrowRight, Shield } from 'lucide-react';
import StoryCard from '../components/StoryCard';
import api from '../lib/api';

interface Story {
  id: string; title: string; cover_url?: string; type: 'text' | 'comic';
  genre?: string; author_name: string; views: number; rating_avg?: number;
  rating_count?: number; chapter_count: number; status?: string;
}

export default function HomePage() {
  const [featured, setFeatured] = useState<Story[]>([]);
  const [latest, setLatest] = useState<Story[]>([]);

  useEffect(() => {
    api.get('/stories?sort=popular&page=1').then(r => setFeatured(r.data.stories?.slice(0, 6) ?? [])).catch(() => {});
    api.get('/stories?sort=latest&page=1').then(r => setLatest(r.data.stories?.slice(0, 8) ?? [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a12]">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-100 mb-3 font-['Rajdhani'] tracking-tight">
            Rebuild World
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Explore stories of survival and rebuild in a post-civilization world. Discover text stories and comics from our growing community.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-[#12121e] rounded-xl border border-slate-800/60 grid grid-cols-3 divide-x divide-slate-800/60">
          {[
            { icon: BookOpen, label: 'Stories', value: 'Archive' },
            { icon: Shield, label: 'Community', value: 'Growing' },
            { icon: TrendingUp, label: 'Access', value: 'Free' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center py-6 px-4">
              <s.icon className="w-6 h-6 text-cyan-500/70 mb-2" />
              <span className="text-xl font-bold text-slate-200 font-['Rajdhani']">{s.value}</span>
              <span className="text-sm text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Stories */}
      {featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide">Popular Archives</h2>
            <Link to="/browse?sort=popular" className="flex items-center gap-1 text-cyan-400 font-medium hover:text-cyan-300 transition text-sm">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {featured.map(s => <StoryCard key={s.id} {...s} />)}
          </div>
        </section>
      )}

      {/* Latest */}
      {latest.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 font-['Rajdhani'] tracking-wide">Latest Transmissions</h2>
            <Link to="/browse?sort=latest" className="flex items-center gap-1 text-cyan-400 font-medium hover:text-cyan-300 transition text-sm">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {latest.map(s => <StoryCard key={s.id} {...s} />)}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/20 via-[#0f0f1a] to-cyan-950/20" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100 mb-4 font-['Rajdhani'] tracking-wide">Ready to Explore?</h2>
          <p className="text-slate-400 mb-8 text-lg">Join the network. Read stories from the wasteland. Leave your mark on a world being rebuilt.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition shadow-[0_0_30px_rgba(0,212,255,0.25)] font-['Rajdhani'] text-lg tracking-wide uppercase">
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-600">
          &copy; {new Date().getFullYear()} Rebuild World. The ruins hold stories worth reading.
        </div>
      </footer>
    </div>
  );
}
