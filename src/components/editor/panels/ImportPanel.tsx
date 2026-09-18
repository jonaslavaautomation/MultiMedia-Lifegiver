import { useRef, useState } from 'react';
import { Upload, CheckCircle2, XCircle, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite-specific: resolves to a URL pdfjs-dist's worker can be loaded from,
// instead of bundling it inline (pdf.js insists on a real Worker script).
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadMediaFile, deleteMediaObject } from '@/lib/mediaStorage';
import { createMediaBackgroundSlideContent } from '@/lib/slideContent';
import { SLIDE_WIDTH } from '@/lib/editorConstants';
import type { Slide } from '@/types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

interface ImportPanelProps {
  presentationId: string;
  /** Current slide count — new slides are appended after these (sort_order continues from here). */
  existingSlideCount: number;
  /** Fires with each batch of newly-created slides as they're saved, so the caller can append them to its own list. */
  onImported: (slides: Slide[]) => void;
}

interface QueueItem {
  id: string;
  name: string;
  status: 'pending' | 'rendering' | 'uploading' | 'done' | 'error';
  progress?: string;
  error?: string;
}

const ACCEPTED_TYPES = 'application/pdf,image/jpeg,image/png,image/webp';

/**
 * "Import" nav rail panel — brings in slides from an existing deck the
 * church already has, instead of rebuilding it by hand. True .pptx parsing
 * has no reliable client-side option (PowerPoint's format has no
 * lightweight in-browser renderer), so this accepts PDF — which PowerPoint
 * and Canva can both export to directly — and rasterizes each page into its
 * own new slide, plus plain image files for anyone who already exported
 * their deck as individual PNGs/JPGs. Each page becomes a slide with that
 * page's image as a full-bleed background (createMediaBackgroundSlideContent),
 * the same shape a Media-background slide already has — fully compatible
 * with the rest of the editor and Live Presentation, just not text-editable
 * (there's no way to recover the original text from a page image).
 */
export function ImportPanel({ presentationId, existingSlideCount, onImported }: ImportPanelProps) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function renderPdfPageToBlob(page: pdfjsLib.PDFPageProxy): Promise<Blob> {
    const nativeViewport = page.getViewport({ scale: 1 });
    // Render at the slide's own logical width regardless of the PDF page's
    // native size, so an imported page looks as sharp as any other slide.
    const scale = SLIDE_WIDTH / nativeViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create a canvas to render this page.');

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to render this page as an image.'))), 'image/png');
    });
  }

  async function uploadImageAsSlide(file: File | Blob, title: string, sortOrder: number): Promise<Slide> {
    if (!user) throw new Error('You need to be signed in to import slides.');

    const asFile = file instanceof File ? file : new File([file], `${title}.png`, { type: 'image/png' });
    const { path } = await uploadMediaFile(asFile, user.id, 'backgrounds');

    const { data: mediaRow, error: mediaError } = await supabase
      .from('media')
      .insert({
        name: title,
        type: 'image',
        url: path,
        thumbnail_url: path,
        file_size: asFile.size,
        folder: 'backgrounds',
        metadata: { mimeType: asFile.type, importedFrom: 'slide-import' },
      })
      .select('id')
      .single();

    if (mediaError || !mediaRow) {
      await deleteMediaObject(path);
      throw new Error(mediaError?.message ?? 'Failed to save the uploaded image.');
    }

    const { data: slideRow, error: slideError } = await supabase
      .from('slides')
      .insert({
        presentation_id: presentationId,
        title,
        content: createMediaBackgroundSlideContent(mediaRow.id as string),
        background_id: mediaRow.id as string,
        sort_order: sortOrder,
      })
      .select('*')
      .single();

    if (slideError || !slideRow) throw new Error(slideError?.message ?? 'Failed to create the slide.');
    return slideRow as Slide;
  }

  async function importPdf(item: QueueItem, file: File, startingSortOrder: number): Promise<number> {
    updateItem(item.id, { status: 'rendering', progress: 'Opening PDF…' });
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const baseName = file.name.replace(/\.pdf$/i, '');
    const created: Slide[] = [];

    try {
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        updateItem(item.id, { status: 'rendering', progress: `Rendering page ${pageNum} of ${pdf.numPages}…` });
        const page = await pdf.getPage(pageNum);
        const blob = await renderPdfPageToBlob(page);

        updateItem(item.id, { status: 'uploading', progress: `Uploading page ${pageNum} of ${pdf.numPages}…` });
        const title = pdf.numPages > 1 ? `${baseName} (${pageNum}/${pdf.numPages})` : baseName;
        const slide = await uploadImageAsSlide(blob, title, startingSortOrder + created.length);
        created.push(slide);
        onImported([slide]);
      }
      updateItem(item.id, { status: 'done', progress: `Added ${created.length} slide${created.length === 1 ? '' : 's'}` });
    } catch (err) {
      updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Failed to import this PDF.' });
    }

    return created.length;
  }

  async function importImage(item: QueueItem, file: File, sortOrder: number): Promise<number> {
    updateItem(item.id, { status: 'uploading', progress: 'Uploading…' });
    try {
      const title = file.name.replace(/\.[^.]+$/, '');
      const slide = await uploadImageAsSlide(file, title, sortOrder);
      updateItem(item.id, { status: 'done', progress: 'Added as a slide' });
      onImported([slide]);
      return 1;
    } catch (err) {
      updateItem(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Failed to import this image.' });
      return 0;
    }
  }

  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const items: QueueItem[] = files.map((file) => ({ id: crypto.randomUUID(), name: file.name, status: 'pending' }));
    setQueue((prev) => [...prev, ...items]);

    setBusy(true);
    // Sequential, not parallel — each file's slide(s) need a contiguous,
    // predictable sort_order continuing from wherever the last one left off,
    // and this keeps only one "rendering page N of M" progress line active
    // at a time instead of several racing for attention.
    let nextSortOrder = existingSlideCount;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const item = items[i];
      const addedCount = file.type === 'application/pdf' ? await importPdf(item, file, nextSortOrder) : await importImage(item, file, nextSortOrder);
      nextSortOrder += addedCount;
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-zinc-500 leading-relaxed">
        Bring in an existing PowerPoint or Canva deck. Export it as a <strong>PDF</strong> first (File → Export/Download
        as PDF) — each page becomes its own slide here. Individual PNG/JPG exports work too.
      </p>
      <p className="text-[11px] text-amber-600 leading-relaxed">
        .pptx files aren't supported directly — there's no reliable way to read PowerPoint's format in the browser.
        Export to PDF and upload that instead.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (busy) return;
          if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          busy ? 'opacity-60 cursor-not-allowed border-zinc-200' : 'cursor-pointer'
        } ${dragOver ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 hover:border-zinc-300'}`}
      >
        <Upload className="w-5 h-5 text-zinc-500" />
        <p className="text-xs text-zinc-700">Drag & drop a PDF or images here</p>
        <p className="text-[11px] text-zinc-500">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) void addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {queue.length > 0 && (
        <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
          {queue.map((item) => (
            <div key={item.id} className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/60 border border-zinc-200/80">
              {item.name.toLowerCase().endsWith('.pdf') ? (
                <FileText className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              ) : (
                <ImageIcon className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-700 truncate">{item.name}</p>
                {item.progress && item.status !== 'error' && <p className="text-[11px] text-zinc-500 truncate">{item.progress}</p>}
                {item.status === 'error' && <p className="text-[11px] text-red-600 truncate">{item.error}</p>}
              </div>
              {(item.status === 'pending' || item.status === 'rendering' || item.status === 'uploading') && (
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin shrink-0" />
              )}
              {item.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {item.status === 'error' && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
