import { useState } from 'react';
import { Link2, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MediaPicker } from '@/components/media/MediaPicker';
import { MotionLibraryPanel } from '@/components/motion/MotionLibraryPanel';
import { COLOR_SWATCHES } from '@/lib/editorConstants';
import type { MediaItem } from '@/types';

interface BackgroundPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPickColor: (hex: string) => void;
  /** Called with the picked item — may be an image or a video. */
  onPickMedia: (item: MediaItem) => void;
  /** Called with a pasted direct video file URL (a "live motion" background not uploaded to Media). */
  onPickEmbedUrl: (url: string) => void;
  /** Called with a built-in Motion Background Library preset id. */
  onPickMotion: (motionId: string) => void;
}

type Tab = 'color' | 'media' | 'motion' | 'embed';

const VIDEO_URL_PATTERN = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

export function BackgroundPickerModal({ open, onClose, onPickColor, onPickMedia, onPickEmbedUrl, onPickMotion }: BackgroundPickerModalProps) {
  const [tab, setTab] = useState<Tab>('color');
  const [customColor, setCustomColor] = useState('#09090b');
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedError, setEmbedError] = useState<string | null>(null);

  function handleApplyEmbedUrl() {
    const url = embedUrl.trim();
    if (!url) return;
    if (!VIDEO_URL_PATTERN.test(url)) {
      setEmbedError('That doesn’t look like a direct video file link (must end in .mp4, .webm, .ogg, or .mov).');
      return;
    }
    setEmbedError(null);
    onPickEmbedUrl(url);
    setEmbedUrl('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Slide Background">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant={tab === 'color' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('color')}>
            Solid Color
          </Button>
          <Button variant={tab === 'media' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('media')}>
            Media
          </Button>
          <Button variant={tab === 'motion' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('motion')}>
            <Sparkles className="w-3.5 h-3.5" /> Motion
          </Button>
          <Button variant={tab === 'embed' ? 'primary' : 'outline'} size="sm" onClick={() => setTab('embed')}>
            <Link2 className="w-3.5 h-3.5" /> Embed URL
          </Button>
        </div>

        {tab === 'color' ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-5 gap-2">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => {
                    onPickColor(swatch);
                    onClose();
                  }}
                  className="w-9 h-9 rounded-full border-2 border-transparent hover:border-brand-500 transition-all"
                  style={{ backgroundColor: swatch }}
                  title={swatch}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="w-9 h-9 rounded-lg border border-zinc-300 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="flex-1 rounded-lg bg-zinc-50 border border-zinc-300/80 text-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onPickColor(customColor);
                  onClose();
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        ) : tab === 'media' ? (
          <MediaPicker
            accept={['image', 'video']}
            multiple={false}
            onSelect={(items) => {
              if (items[0]) {
                onPickMedia(items[0]);
                onClose();
              }
            }}
            onCancel={onClose}
          />
        ) : tab === 'motion' ? (
          <MotionLibraryPanel
            onSelect={(motionId) => {
              onPickMotion(motionId);
              onClose();
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-zinc-600 leading-relaxed">
              Paste a direct link to a video file to use as a live, looping motion background — no upload needed.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={embedUrl}
                onChange={(e) => {
                  setEmbedUrl(e.target.value);
                  setEmbedError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyEmbedUrl();
                }}
                placeholder="https://example.com/background.mp4"
                className="flex-1 rounded-lg bg-zinc-50 border border-zinc-300/80 text-zinc-900 placeholder-zinc-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              />
              <Button variant="primary" size="sm" onClick={handleApplyEmbedUrl} disabled={!embedUrl.trim()}>
                Apply
              </Button>
            </div>
            {embedError && <p className="text-xs text-red-600">{embedError}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
