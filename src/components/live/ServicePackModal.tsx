import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Download, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { formatFileSize } from '@/lib/mediaStorage';
import {
  checkServiceReadiness,
  downloadServicePack,
  clearServicePack,
  getServicePackSize,
  type ServiceReadiness,
  type DownloadProgress,
} from '@/lib/servicePack';
import type { Slide } from '@/types';

interface ServicePackModalProps {
  open: boolean;
  onClose: () => void;
  slides: Slide[];
}

/**
 * "CHECK SERVICE" + "Download for Offline Use" in one place — lets the
 * Media Tech verify, before going live, exactly which media backgrounds
 * this presentation needs and whether they're actually available locally
 * right now. Deliberately never claims READY unless every referenced asset
 * is truly present in IndexedDB at the moment of checking (see
 * checkServiceReadiness in servicePack.ts) — a false READY is worse than no
 * check at all.
 */
export function ServicePackModal({ open, onClose, slides }: ServicePackModalProps) {
  const [readiness, setReadiness] = useState<ServiceReadiness | null>(null);
  const [packSizeBytes, setPackSizeBytes] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [lastRunFailed, setLastRunFailed] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const [r, size] = await Promise.all([checkServiceReadiness(slides), getServicePackSize()]);
    setReadiness(r);
    setPackSizeBytes(size);
  }, [slides]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function handleDownload() {
    setDownloading(true);
    setLastRunFailed([]);
    setProgress({ total: 0, completed: 0, failed: [] });
    const result = await downloadServicePack(slides, setProgress);
    setLastRunFailed(result.failed);
    setDownloading(false);
    await refresh();
  }

  async function handleClear() {
    await clearServicePack();
    setLastRunFailed([]);
    await refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Service Pack">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500 leading-relaxed">
          Downloads every image/video background this presentation uses so it can play with no internet connection
          at all — do this once while you still have a good connection, ideally before the service starts.
        </p>

        {readiness === null ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking…
          </div>
        ) : readiness.totalAssets === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            This presentation has no media backgrounds to download — it's already fully self-contained.
          </div>
        ) : readiness.ready ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            READY — all {readiness.totalAssets} media background{readiness.totalAssets === 1 ? '' : 's'} downloaded
            ({formatFileSize(packSizeBytes)}). This presentation will play with no internet connection.
          </div>
        ) : (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              NOT READY — {readiness.readyAssets} of {readiness.totalAssets} media backgrounds downloaded.
            </div>
            <ul className="text-xs text-amber-700 pl-6 list-disc">
              {readiness.missing.map((m) => (
                <li key={m.mediaId}>
                  Used by: {m.slideTitles.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {downloading && progress && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
              <div
                className="h-full bg-lime-500 transition-all duration-300"
                style={{ width: progress.total > 0 ? `${(progress.completed / progress.total) * 100}%` : '0%' }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              Downloading… {progress.completed} of {progress.total}
            </p>
          </div>
        )}

        {!downloading && lastRunFailed.length > 0 && (
          <p className="text-xs text-red-600">
            {lastRunFailed.length} asset{lastRunFailed.length === 1 ? '' : 's'} couldn't be downloaded just now —
            check your connection and try again. Anything already downloaded is unaffected.
          </p>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            disabled={downloading || readiness === null || readiness.totalAssets === 0}
            className="flex-1 justify-center"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {downloading ? 'Downloading…' : 'Download for Offline Use'}
          </Button>
          {packSizeBytes > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClear} disabled={downloading} title="Free the storage used by downloaded assets">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
