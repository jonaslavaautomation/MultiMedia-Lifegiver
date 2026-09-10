import { useRef, useState } from 'react';
import { Upload, CheckCircle2, XCircle, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { deleteMediaObject, uploadMediaFile, validateFile } from '@/lib/mediaStorage';

interface QueueItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface MediaUploadModalProps {
  open: boolean;
  onClose: () => void;
  /** Called once any file finishes uploading successfully, so the caller can refresh its list. */
  onUploaded: () => void;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

export function MediaUploadModal({ open, onClose, onUploaded }: MediaUploadModalProps) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClose() {
    setQueue([]);
    onClose();
  }

  async function uploadOne(item: QueueItem) {
    if (!user) return;

    const validation = validateFile(item.file);
    if (!validation.ok) {
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'error', error: validation.reason } : q)));
      return;
    }

    setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q)));

    try {
      const { path } = await uploadMediaFile(item.file, user.id);

      const { error: insertError } = await supabase.from('media').insert({
        name: item.file.name,
        type: validation.type,
        url: path,
        thumbnail_url: validation.type === 'image' ? path : null,
        file_size: item.file.size,
        metadata: { mimeType: item.file.type },
      });

      if (insertError) {
        await deleteMediaObject(path);
        throw insertError;
      }

      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'done' } : q)));
      onUploaded();
    } catch (err) {
      console.error('Error uploading media:', err);
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: 'error', error: message } : q)));
    }
  }

  function addFiles(files: FileList | File[]) {
    const items: QueueItem[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
    }));
    setQueue((prev) => [...prev, ...items]);
    items.forEach((item) => void uploadOne(item));
  }

  return (
    <Modal open={open} onClose={handleClose} title="Upload Media">
      <div className="flex flex-col gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-maroon-500 bg-maroon-950/20' : 'border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Upload className="w-6 h-6 text-zinc-500" />
          <p className="text-sm text-zinc-300">Drag & drop images or videos here</p>
          <p className="text-xs text-zinc-500">or click to browse — JPG, PNG, WEBP, GIF up to 10MB, MP4/WEBM up to 200MB</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {queue.length > 0 && (
          <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
                {item.file.type.startsWith('video') ? (
                  <Video className="w-4 h-4 text-zinc-500 shrink-0" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-300 truncate">{item.file.name}</p>
                  {item.status === 'error' && <p className="text-[11px] text-red-400 truncate">{item.error}</p>}
                </div>
                {item.status === 'uploading' && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />}
                {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                {item.status === 'error' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={handleClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
