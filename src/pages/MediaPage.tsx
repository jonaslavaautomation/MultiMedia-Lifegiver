import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Trash2,
  Search,
  MoreVertical,
  Pencil,
  Calendar,
  User,
  CheckSquare,
  X,
  Sparkles,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useSignedUrl } from '@/components/media/useSignedUrl';
import { MediaUploadModal } from '@/components/media/MediaUploadModal';
import { deleteMediaObject, formatFileSize } from '@/lib/mediaStorage';
import { createImageBackgroundSlideContent } from '@/lib/slideContent';
import type { MediaItemWithUploader, MediaType } from '@/types';

type TypeFilter = 'all' | MediaType;

export function MediaPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MediaItemWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [uploadOpen, setUploadOpen] = useState(false);

  const [renameTarget, setRenameTarget] = useState<MediaItemWithUploader | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<MediaItemWithUploader | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('media')
      .select('*, uploader:profiles!media_uploaded_by_fkey(full_name, role)')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching media:', fetchError.message);
      setError('Failed to load the media library. Please try again.');
      setLoading(false);
      return;
    }

    setItems((data as MediaItemWithUploader[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const openRename = (item: MediaItemWithUploader) => {
    setMenuOpen(null);
    setRenameError(null);
    setRenameValue(item.name);
    setRenameTarget(item);
  };

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    setRenameError(null);

    const { error: renameErr } = await supabase
      .from('media')
      .update({ name: renameValue.trim() })
      .eq('id', renameTarget.id);

    if (renameErr) {
      console.error('Error renaming media:', renameErr.message);
      setRenameError('Failed to rename this item. Please try again.');
      setRenaming(false);
      return;
    }

    setRenaming(false);
    setRenameTarget(null);
    fetchMedia();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    await deleteMediaObject(deleteTarget.url);
    const { error: deleteErr } = await supabase.from('media').delete().eq('id', deleteTarget.id);

    if (deleteErr) {
      console.error('Error deleting media row:', deleteErr.message);
      setDeleteError('Failed to delete this item. Please try again.');
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setDeleteTarget(null);
    fetchMedia();
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddToSlide() {
    const chosen = items.filter((item) => selectedIds.has(item.id));
    if (chosen.length === 0) return;

    setGenerating(true);
    setGenerateError(null);

    const { data: presentation, error: presError } = await supabase
      .from('presentations')
      .insert({ title: `Media Slides — ${new Date().toLocaleDateString()}` })
      .select('id')
      .maybeSingle();

    if (presError || !presentation) {
      console.error('Error creating presentation:', presError?.message);
      setGenerateError('Failed to create the presentation. Please try again.');
      setGenerating(false);
      return;
    }

    const slideRows = chosen.map((item, index) => ({
      presentation_id: presentation.id,
      title: item.name,
      content: createImageBackgroundSlideContent(item.id),
      background_id: item.id,
      sort_order: index,
    }));

    const { error: slidesError } = await supabase.from('slides').insert(slideRows);

    if (slidesError) {
      console.error('Error generating slides from media:', slidesError.message);
      await supabase.from('presentations').delete().eq('id', presentation.id);
      setGenerateError('Failed to generate slides. Please try again.');
      setGenerating(false);
      return;
    }

    navigate(`/presentations/${presentation.id}/edit`);
  }

  const filtered = items.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return item.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-zinc-100">Media</h1>
          <p className="text-sm text-zinc-500 mt-1">Upload and manage images and videos for your presentations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            onClick={() => {
              setSelectMode((v) => !v);
              setSelectedIds(new Set());
            }}
          >
            <CheckSquare className="w-4 h-4" /> {selectMode ? 'Cancel Select' : 'Select'}
          </Button>
          <Button variant="primary" onClick={() => setUploadOpen(true)}>
            <Upload className="w-4 h-4" /> Upload
          </Button>
        </div>
      </div>

      {/* Search + filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search media…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500/40 focus:border-maroon-600/60"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'image', 'video'] as TypeFilter[]).map((t) => (
            <Button key={t} variant={typeFilter === t ? 'primary' : 'outline'} size="sm" onClick={() => setTypeFilter(t)} className="capitalize">
              {t === 'all' ? 'All' : `${t}s`}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6">
          <Alert message={error} onRetry={fetchMedia} />
        </div>
      )}

      {error ? null : loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-zinc-900/40 border border-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={ImageIcon}
            title={search ? 'No matching media' : 'No media yet'}
            description={search ? 'Try a different search term.' : 'Upload an image or video to get started.'}
            action={
              !search && (
                <Button variant="primary" onClick={() => setUploadOpen(true)}>
                  <Upload className="w-4 h-4" /> Upload Media
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              selectMode={selectMode}
              selected={selectedIds.has(item.id)}
              menuOpen={menuOpen === item.id}
              onToggleMenu={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
              onCloseMenu={() => setMenuOpen(null)}
              onSelect={() => toggleSelected(item.id)}
              onRename={() => openRename(item)}
              onDelete={() => {
                setMenuOpen(null);
                setDeleteError(null);
                setDeleteTarget(item);
              }}
            />
          ))}
        </div>
      )}

      {/* Select-mode sticky action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-4 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-200">{selectedIds.size} selected</p>
              {generateError && <p className="text-xs text-red-400 mt-0.5">{generateError}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
              <Button variant="primary" onClick={handleAddToSlide} disabled={generating}>
                {generating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Add to Slide
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <MediaUploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={fetchMedia} />

      {/* Rename modal */}
      <Modal
        open={!!renameTarget}
        onClose={() => { setRenameTarget(null); setRenameError(null); }}
        title="Rename Media"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRenameTarget(null); setRenameError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRename} disabled={!renameValue.trim() || renaming}>
              {renaming ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {renameError && <Alert message={renameError} />}
          <Input
            label="Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            autoFocus
          />
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        title="Delete Media"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : (<><Trash2 className="w-4 h-4" /> Delete</>)}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {deleteError && <Alert message={deleteError} />}
          <p className="text-sm text-zinc-400 leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-zinc-200">{deleteTarget?.name}</span>? This cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}

interface MediaCardProps {
  item: MediaItemWithUploader;
  selectMode: boolean;
  selected: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function MediaCard({ item, selectMode, selected, menuOpen, onToggleMenu, onCloseMenu, onSelect, onRename, onDelete }: MediaCardProps) {
  const thumbUrl = useSignedUrl(item.type === 'image' ? item.url : item.thumbnail_url);
  const canSelect = selectMode && item.type === 'image';

  return (
    <Card
      className={`p-0 overflow-hidden relative transition-all ${selected ? 'border-maroon-500 ring-2 ring-maroon-500/30' : ''}`}
      onClick={canSelect ? onSelect : undefined}
    >
      <div className="aspect-square bg-zinc-900/60 flex items-center justify-center relative">
        {thumbUrl ? (
          <img src={thumbUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : item.type === 'video' ? (
          <Video className="w-8 h-8 text-zinc-600" />
        ) : (
          <ImageIcon className="w-8 h-8 text-zinc-600" />
        )}

        {canSelect && (
          <div
            className={`absolute top-2 left-2 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
              selected ? 'bg-maroon-600 border-maroon-600' : 'bg-black/40 border-white/60'
            }`}
          >
            {selected && <Check className="w-3 h-3 text-white" />}
          </div>
        )}

        {!selectMode && (
          <div className="absolute top-2 right-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleMenu();
              }}
              className="p-1.5 rounded-lg bg-black/50 text-zinc-200 hover:bg-black/70 transition-all"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-0" onClick={(e) => { e.stopPropagation(); onCloseMenu(); }} />
                <div className="absolute right-0 mt-1 w-36 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                  <button
                    onClick={(e) => { e.stopPropagation(); onRename(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Rename
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs font-medium text-zinc-200 truncate mb-1">{item.name}</p>
        <div className="flex items-center gap-1.5 mb-2">
          <Badge variant={item.type === 'video' ? 'info' : 'default'}>{item.type}</Badge>
          <span className="text-[10px] text-zinc-500">{formatFileSize(item.file_size)}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {new Date(item.created_at).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1 truncate">
            <User className="w-2.5 h-2.5" />
            {item.uploader?.full_name ?? 'Unknown'}
          </span>
        </div>
      </div>
    </Card>
  );
}
