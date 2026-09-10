import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { MediaPicker } from '@/components/media/MediaPicker';

interface AddImageModalProps {
  open: boolean;
  onClose: () => void;
  /** mediaId is set when the image came from the library, so it can be linked on the object. */
  onInsert: (url: string, mediaId?: string) => void;
}

export function AddImageModal({ open, onClose, onInsert }: AddImageModalProps) {
  const [url, setUrl] = useState('');

  function handleInsertUrl() {
    if (!url.trim()) return;
    onInsert(url.trim());
    setUrl('');
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Image">
      <div className="flex flex-col gap-5">
        <MediaPicker
          accept={['image']}
          multiple={false}
          onSelect={(items) => {
            if (items[0]) {
              onInsert(items[0].url, items[0].id);
              onClose();
            }
          }}
          onCancel={onClose}
        />

        <div className="pt-4 border-t border-zinc-800">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
            Or paste an image URL
          </p>
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
            <Button variant="secondary" onClick={handleInsertUrl} disabled={!url.trim()}>
              Insert
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
