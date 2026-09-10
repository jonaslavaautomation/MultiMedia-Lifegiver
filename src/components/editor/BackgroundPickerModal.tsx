import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { MediaPicker } from '@/components/media/MediaPicker';
import { COLOR_SWATCHES } from '@/lib/editorConstants';
import type { MediaItem } from '@/types';

interface BackgroundPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPickColor: (hex: string) => void;
  /** Called with the picked item — may be an image or a video. */
  onPickMedia: (item: MediaItem) => void;
}

type Tab = 'color' | 'media';

export function BackgroundPickerModal({ open, onClose, onPickColor, onPickMedia }: BackgroundPickerModalProps) {
  const [tab, setTab] = useState<Tab>('color');
  const [customColor, setCustomColor] = useState('#09090b');

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
                  className="w-9 h-9 rounded-full border-2 border-transparent hover:border-maroon-500 transition-all"
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
                className="w-9 h-9 rounded-lg border border-zinc-700 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="flex-1 rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-zinc-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-maroon-500/40"
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
        ) : (
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
        )}
      </div>
    </Modal>
  );
}
