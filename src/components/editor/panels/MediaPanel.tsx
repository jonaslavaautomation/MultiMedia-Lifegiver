import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MediaPicker } from '@/components/media/MediaPicker';
import type { MediaItem } from '@/types';

interface MediaPanelProps {
  onInsertItem: (item: MediaItem) => void;
  onInsertUrl: (url: string) => void;
}

/** Nav rail "Media" drawer — pick an uploaded image, or paste a URL, to drop onto the slide as a movable object. */
export function MediaPanel({ onInsertItem, onInsertUrl }: MediaPanelProps) {
  const [url, setUrl] = useState('');

  function handleInsertUrl() {
    if (!url.trim()) return;
    onInsertUrl(url.trim());
    setUrl('');
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-zinc-500">
        Adds an image as a movable object. For a full-slide background instead, use the Background button above the canvas.
      </p>
      <MediaPicker accept={['image']} multiple={false} onSelect={(items) => items[0] && onInsertItem(items[0])} />

      <div className="pt-3 border-t border-zinc-200/80">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">Or paste an image URL</p>
        <div className="flex items-center gap-2">
          <Input
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInsertUrl();
            }}
            className="flex-1"
          />
          <Button variant="secondary" size="sm" onClick={handleInsertUrl} disabled={!url.trim()}>
            Insert
          </Button>
        </div>
      </div>
    </div>
  );
}
