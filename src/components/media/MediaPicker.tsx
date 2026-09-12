import { useCallback, useEffect, useState } from 'react';
import { Search, Upload, Image as ImageIcon, Video, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSignedUrl } from '@/components/media/useSignedUrl';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MediaItem, MediaType } from '@/types';

interface MediaPickerProps {
  /** Restrict to these media types. Omit to show everything. */
  accept?: MediaType[];
  /** Allow selecting more than one item (shows checkboxes + a confirm bar). */
  multiple?: boolean;
  onSelect: (items: MediaItem[]) => void;
  onCancel?: () => void;
  /** Shown as a button in the header when the caller can also open an upload flow. */
  onUploadNew?: () => void;
  className?: string;
}

/**
 * Reusable media grid + search + select. Presentational only — no Modal
 * chrome of its own, so it can be embedded directly on MediaPage or inside
 * a Modal (the editor's BackgroundPickerModal / AddImageModal).
 */
export function MediaPicker({ accept, multiple = false, onSelect, onCancel, onUploadNew, className = '' }: MediaPickerProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase.from('media').select('*').order('created_at', { ascending: false });
    if (accept && accept.length > 0) {
      query = query.in('type', accept);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching media:', fetchError.message);
      setError('Failed to load the media library.');
      setLoading(false);
      return;
    }

    setItems((data as MediaItem[]) ?? []);
    setLoading(false);
  }, [accept]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filtered = items.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));

  function handlePick(item: MediaItem) {
    if (!multiple) {
      onSelect([item]);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  function confirmSelection() {
    onSelect(items.filter((item) => selectedIds.has(item.id)));
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search media…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-9 pr-3 py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
          />
        </div>
        {onUploadNew && (
          <Button variant="outline" size="sm" onClick={onUploadNew}>
            <Upload className="w-3.5 h-3.5" /> Upload
          </Button>
        )}
      </div>

      {error ? (
        <Alert message={error} onRetry={fetchItems} />
      ) : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-zinc-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={search ? 'No matching media' : 'No media yet'}
          description={search ? 'Try a different search term.' : 'Upload an image or video to get started.'}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
          {filtered.map((item) => (
            <MediaPickerCard
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              multiple={multiple}
              onClick={() => handlePick(item)}
            />
          ))}
        </div>
      )}

      {multiple && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
          <span className="text-xs text-zinc-500">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="primary" size="sm" disabled={selectedIds.size === 0} onClick={confirmSelection}>
              Select{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MediaPickerCard({
  item,
  selected,
  multiple,
  onClick,
}: {
  item: MediaItem;
  selected: boolean;
  multiple: boolean;
  onClick: () => void;
}) {
  const thumbUrl = useSignedUrl(item.type === 'image' ? item.url : item.thumbnail_url);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative aspect-square rounded-xl overflow-hidden border transition-all text-left ${
        selected ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-zinc-200/80 hover:border-zinc-300'
      }`}
    >
      {thumbUrl ? (
        <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/60">
          {item.type === 'video' ? (
            <Video className="w-6 h-6 text-zinc-400" />
          ) : (
            <ImageIcon className="w-6 h-6 text-zinc-400" />
          )}
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1">
        <p className="text-[10px] text-zinc-800 truncate">{item.name}</p>
      </div>
      {multiple && selected && (
        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}
