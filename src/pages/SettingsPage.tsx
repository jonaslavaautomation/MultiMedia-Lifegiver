import { Settings as SettingsIcon, Shield, Church, Info } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function SettingsPage() {
  const { profile } = useAuth();

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Application configuration and preferences.</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Application info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-maroon-600 to-maroon-800 flex items-center justify-center">
              <Church className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Application</h2>
              <p className="text-xs text-zinc-500">LifeGiver Media Studio</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Version</p>
              <p className="text-sm font-medium text-zinc-200">Phase 3 — Live Presentation</p>
            </div>
            <div className="rounded-xl bg-zinc-900/40 border border-zinc-800/50 p-4">
              <p className="text-xs text-zinc-500 mb-1">Current Phase</p>
              <p className="text-sm font-medium text-zinc-200">3 of 3</p>
            </div>
          </div>
        </Card>

        {/* Your account */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-zinc-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-100">Your Account</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-zinc-400">Display Name</span>
              <span className="text-sm font-medium text-zinc-200">{profile?.full_name ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-zinc-800/60">
              <span className="text-sm text-zinc-400">Role</span>
              <Badge variant={profile?.role === 'admin' ? 'danger' : 'info'}>
                <Shield className="w-3 h-3" />
                {profile?.role ?? 'media'}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-zinc-800/60">
              <span className="text-sm text-zinc-400">Account Created</span>
              <span className="text-sm font-medium text-zinc-200">
                {profile ? new Date(profile.created_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </Card>

        {/* Phase info */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Info className="w-5 h-5 text-zinc-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-100">Feature Phases</h2>
          </div>
          <div className="space-y-3">
            {[
              { phase: 'Phase 1', label: 'Foundation — Auth, Dashboard, Presentations', done: true },
              { phase: 'Phase 2', label: 'Songs, Bible, Media, Templates', done: true },
              { phase: 'Phase 3', label: 'Slide Editor & Live Presentation Mode', done: true },
            ].map((item) => (
              <div key={item.phase} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-400 w-16">{item.phase}</span>
                  <span className="text-sm text-zinc-300">{item.label}</span>
                </div>
                {item.done ? (
                  <Badge variant="success">Complete</Badge>
                ) : (
                  <Badge variant="default">Upcoming</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
