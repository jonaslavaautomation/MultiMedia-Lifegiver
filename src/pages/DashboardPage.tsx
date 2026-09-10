import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Presentation, Music4, Image, LayoutTemplate, Calendar, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import type { Presentation as PresentationType } from '@/types';

interface Stats {
  presentations: number;
  songs: number;
  media: number;
  templates: number;
}

export function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ presentations: 0, songs: 0, media: 0, templates: 0 });
  const [recentPresentations, setRecentPresentations] = useState<PresentationType[]>([]);
  const [upcomingServices, setUpcomingServices] = useState<PresentationType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const [presRes, songsRes, mediaRes, templatesRes, recentRes, upcomingRes] = await Promise.all([
        supabase.from('presentations').select('id', { count: 'exact', head: true }),
        supabase.from('songs').select('id', { count: 'exact', head: true }),
        supabase.from('media').select('id', { count: 'exact', head: true }),
        supabase.from('templates').select('id', { count: 'exact', head: true }),
        supabase.from('presentations').select('*').order('updated_at', { ascending: false }).limit(5),
        supabase
          .from('presentations')
          .select('*')
          .gte('service_date', new Date().toISOString().split('T')[0])
          .order('service_date', { ascending: true })
          .limit(5),
      ]);

      setStats({
        presentations: presRes.count ?? 0,
        songs: songsRes.count ?? 0,
        media: mediaRes.count ?? 0,
        templates: templatesRes.count ?? 0,
      });
      setRecentPresentations((recentRes.data as PresentationType[]) ?? []);
      setUpcomingServices((upcomingRes.data as PresentationType[]) ?? []);
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-zinc-500 mb-1">{greeting},</p>
        <h1 className="text-2xl lg:text-3xl font-bold font-display text-zinc-100">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-zinc-500 mt-1.5">
          Here's an overview of your church media studio.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Presentations" value={loading ? '—' : stats.presentations} icon={Presentation} accent="maroon" />
        <StatCard label="Songs" value={loading ? '—' : stats.songs} icon={Music4} accent="blue" />
        <StatCard label="Media Files" value={loading ? '—' : stats.media} icon={Image} accent="emerald" />
        <StatCard label="Templates" value={loading ? '—' : stats.templates} icon={LayoutTemplate} accent="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent presentations */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-100">Recent Presentations</h2>
            <Link to="/presentations">
              <Button variant="ghost" size="sm">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {recentPresentations.length === 0 && !loading ? (
            <EmptyState
              icon={Presentation}
              title="No presentations yet"
              description="Create your first worship presentation to get started."
              action={
                <Link to="/presentations">
                  <Button variant="primary" size="sm">Create Presentation</Button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recentPresentations.map((p) => (
                <Link
                  key={p.id}
                  to={`/presentations/${p.id}/edit`}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700 transition-all group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{p.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Updated {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      p.status === 'ready' ? 'success' : p.status === 'archived' ? 'default' : 'warning'
                    }
                  >
                    {p.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming services */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-100">Upcoming Services</h2>
          </div>

          {upcomingServices.length === 0 && !loading ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming services"
              description="Presentations with a service date will appear here."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingServices.map((p) => (
                <Link
                  key={p.id}
                  to={`/presentations/${p.id}/edit`}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/50 hover:border-zinc-700 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-maroon-900/40 to-maroon-950/20 border border-maroon-800/30 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] text-maroon-400 uppercase font-semibold">
                      {p.service_date ? new Date(p.service_date).toLocaleDateString('en-US', { month: 'short' }) : '—'}
                    </span>
                    <span className="text-sm font-bold text-zinc-200">
                      {p.service_date ? new Date(p.service_date).getDate() : '—'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 truncate">{p.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {p.service_date ? new Date(p.service_date).toLocaleDateString('en-US', { weekday: 'long' }) : 'No date set'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
