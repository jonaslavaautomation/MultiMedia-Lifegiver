import { useEffect, useState } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { listCachedPresentations } from '@/lib/offlineStore';
import { getServicePackSize } from '@/lib/servicePack';
import { formatFileSize } from '@/lib/mediaStorage';

interface StorageEstimate {
  usageBytes: number | null;
  quotaBytes: number | null;
}

async function readStorageEstimate(): Promise<StorageEstimate> {
  try {
    if (!navigator.storage?.estimate) return { usageBytes: null, quotaBytes: null };
    const { usage, quota } = await navigator.storage.estimate();
    return { usageBytes: usage ?? null, quotaBytes: quota ?? null };
  } catch {
    return { usageBytes: null, quotaBytes: null };
  }
}

/**
 * Admin-only System Health panel — a plain, honest snapshot of the
 * offline-resilience layers built across Phases 0-2, so an admin can verify
 * for themselves that a presentation is actually prepared rather than
 * taking it on faith. Nothing here is a control surface (no fix/repair
 * actions beyond Refresh) — it only reports what's true right now.
 */
export function SystemHealthCard() {
  const { status, latencyMs } = useConnectionStatus();
  const [cachedPresentations, setCachedPresentations] = useState<{ id: string; title: string; cachedAt: number }[]>([]);
  const [servicePackBytes, setServicePackBytes] = useState(0);
  const [storage, setStorage] = useState<StorageEstimate>({ usageBytes: null, quotaBytes: null });
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const [presentations, packSize, storageEstimate] = await Promise.all([
      listCachedPresentations(),
      getServicePackSize(),
      readStorageEstimate(),
    ]);
    setCachedPresentations(presentations);
    setServicePackBytes(packSize);
    setStorage(storageEstimate);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const statusBadge =
    status === 'online' ? (
      <Badge variant="success">Online{latencyMs !== null ? ` · ${latencyMs}ms` : ''}</Badge>
    ) : status === 'reconnecting' ? (
      <Badge variant="info">Reconnecting…</Badge>
    ) : (
      <Badge variant="warning">Local Mode (offline)</Badge>
    );

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-900">System Health</h2>
            <p className="text-xs text-zinc-500">Offline-resilience status — what's actually true right now, not a claim.</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-zinc-600">Cloud connection</span>
          {statusBadge}
        </div>

        <div className="flex items-center justify-between py-2 border-t border-zinc-200/60">
          <span className="text-sm text-zinc-600">Presentations cached for offline use</span>
          <span className="text-sm font-medium text-zinc-800">{cachedPresentations.length}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-zinc-200/60">
          <span className="text-sm text-zinc-600">Service Pack (downloaded media)</span>
          <span className="text-sm font-medium text-zinc-800">{formatFileSize(servicePackBytes)}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-zinc-200/60">
          <span className="text-sm text-zinc-600">Browser storage used</span>
          <span className="text-sm font-medium text-zinc-800">
            {storage.usageBytes !== null
              ? `${formatFileSize(storage.usageBytes)}${storage.quotaBytes !== null ? ` of ${formatFileSize(storage.quotaBytes)}` : ''}`
              : 'Unavailable in this browser'}
          </span>
        </div>

        {cachedPresentations.length > 0 && (
          <div className="pt-2 border-t border-zinc-200/60">
            <p className="text-xs text-zinc-500 mb-2">Cached presentations (most recent first)</p>
            <div className="space-y-1.5">
              {cachedPresentations
                .slice()
                .sort((a, b) => b.cachedAt - a.cachedAt)
                .slice(0, 5)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-700 truncate">{p.title}</span>
                    <span className="text-zinc-400 shrink-0 ml-2">{new Date(p.cachedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
