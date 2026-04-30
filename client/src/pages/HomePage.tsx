import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, ArrowRight, Crosshair, Zap, Shield } from 'lucide-react';
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
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-[#0a0a12] to-[#0a0a12]" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px]" />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: 'linear-gradient(rgba(0,212,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="max-w-3xl animate-fade-in-up">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="relative">
                <Crosshair className="w-5 h-5 text-cyan-400" />
                <div className="absolute inset-0 blur-md bg-cyan-400/30 rounded-full" />
              </div>
              <span className="text-sm font-medium text-cyan-400/80 tracking-widest uppercase font-['Rajdhani']">Welcome to the Wasteland</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 font-['Rajdhani'] tracking-tight">
              <span className="text-slate-100">Enter the</span><br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 text-glow-cyan">
                Rebuild World
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
              Immerse yourself in stories of survival, technology, and the remnants of a forgotten civilization. Read text stories and image-based comics in a world waiting to be rebuilt.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/browse" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400 transition shadow-[0_0_30px_rgba(0,212,255,0.25)] hover:shadow-[0_0_40px_rgba(0,212,255,0.35)] font-['Rajdhani'] text-lg tracking-wide uppercase">
                <BookOpen className="w-5 h-5" /> Start Reading
              </Link>
              <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-cyan-500/30 text-cyan-400 font-bold rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/50 transition font-['Rajdhani'] text-lg tracking-wide uppercase">
                <Zap className="w-5 h-5" /> Join the Network
              </Link>
            </div>
          </div>
        </div>

        {/* Divider line */}
        <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

      {/* Featured */}
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
