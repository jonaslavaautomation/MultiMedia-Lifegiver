import { useEffect, useState, useCallback } from 'react';
import { Users as UsersIcon, Shield, Music4, User as UserIcon, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Profile, UserRole } from '@/types';

const roleIcon: Record<UserRole, typeof Shield> = {
  admin: Shield,
  media: Music4,
  pastor: UserIcon,
};

const roleBadge: Record<UserRole, 'danger' | 'info' | 'success'> = {
  admin: 'danger',
  media: 'info',
  pastor: 'success',
};

export function UsersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error.message);
      setLoading(false);
      return;
    }

    setProfiles((data as Profile[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const filtered = profiles.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.full_name?.toLowerCase().includes(term) ||
      p.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-zinc-100">Users</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage team members and their roles.</p>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search users…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500/40 focus:border-maroon-600/60"
        />
      </div>

      <Card className="p-5">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-zinc-900/40 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Users will appear here once they sign in for the first time."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-2">User</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-2">Role</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider py-3 px-2 hidden sm:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const RoleIcon = roleIcon[p.role] ?? UserIcon;
                  return (
                    <tr key={p.id} className="border-b border-zinc-900 last:border-0 hover:bg-zinc-900/30 transition-colors">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-maroon-700 to-maroon-900 flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {p.full_name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-200 truncate">{p.full_name ?? 'Unknown'}</p>
                            <p className="text-xs text-zinc-500 truncate">{p.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={roleBadge[p.role]}>
                          <RoleIcon className="w-3 h-3" />
                          {p.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell">
                        <span className="text-xs text-zinc-500">
                          {new Date(p.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
