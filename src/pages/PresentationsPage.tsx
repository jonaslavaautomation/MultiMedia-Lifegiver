import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation, Plus, Copy, Trash2, Search, MoreVertical, Calendar, Clock, User, Pencil, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { PageHeaderIcon } from '@/components/ui/PageHeaderIcon';
import type { PresentationWithCreator } from '@/types';

export function PresentationsPage() {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState<PresentationWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<PresentationWithCreator | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PresentationWithCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchPresentations = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('presentations')
      .select('*, creator:profiles!presentations_created_by_fkey(full_name, role)')
      .order('updated_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching presentations:', fetchError.message);
      setError('Failed to load presentations. Please try again.');
      setLoading(false);
      return;
    }

    setPresentations((data as PresentationWithCreator[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError(null);

    const { data, error: createErr } = await supabase
      .from('presentations')
      .insert({ title: newTitle.trim() })
      .select('id')
      .maybeSingle();

    if (createErr || !data) {
      console.error('Error creating presentation:', createErr?.message);
      setCreateError('Failed to create presentation. Please try again.');
      setCreating(false);
      return;
    }

    // Create the initial slide so the presentation isn't empty when opened.
    const { error: slideErr } = await supabase
      .from('slides')
      .insert({ presentation_id: data.id, title: 'Slide 1', sort_order: 0 });

    if (slideErr) {
      console.error('Error creating initial slide:', slideErr.message);
      // Roll back the presentation so we don't leave an inconsistent record behind.
      await supabase.from('presentations').delete().eq('id', data.id);
      setCreateError('Failed to initialize the presentation. Please try again.');
      setCreating(false);
      return;
    }

    navigate(`/presentations/${data.id}/edit`);
  };

  const handleDuplicate = async (p: PresentationWithCreator) => {
    setMenuOpen(null);
    setError(null);

    const { data, error: dupError } = await supabase
      .from('presentations')
      .insert({
        title: `${p.title} (Copy)`,
        description: p.description,
        status: 'draft',
        service_date: p.service_date,
        slide_data: p.slide_data,
      })
      .select('id')
      .maybeSingle();

    if (dupError || !data) {
      console.error('Error duplicating presentation:', dupError?.message);
      setError('Failed to duplicate presentation. Please try again.');
      return;
    }

    // Copy the source presentation's slides so the duplicate isn't empty.
    const { data: sourceSlides, error: slidesFetchError } = await supabase
      .from('slides')
      .select('title, content, background_id, sort_order')
      .eq('presentation_id', p.id)
      .order('sort_order', { ascending: true });

    if (slidesFetchError) {
      console.error('Error fetching slides to duplicate:', slidesFetchError.message);
    } else if (sourceSlides && sourceSlides.length > 0) {
      const { error: slidesInsertError } = await supabase
        .from('slides')
        .insert(sourceSlides.map((s) => ({ ...s, presentation_id: data.id })));

      if (slidesInsertError) {
        console.error('Error inserting duplicated slides:', slidesInsertError.message);
      }
    } else {
      // Source had no slides (shouldn't normally happen) — seed one so the copy is usable.
      const { error: seedError } = await supabase
        .from('slides')
        .insert({ presentation_id: data.id, title: 'Slide 1', sort_order: 0 });
      if (seedError) {
        console.error('Error seeding slide for duplicate:', seedError.message);
      }
    }

    fetchPresentations();
  };

  const openRename = (p: PresentationWithCreator) => {
    setMenuOpen(null);
    setRenameError(null);
    setRenameValue(p.title);
    setRenameTarget(p);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    setRenameError(null);

    const { error: renameErr } = await supabase
      .from('presentations')
      .update({ title: renameValue.trim() })
      .eq('id', renameTarget.id);

    if (renameErr) {
      console.error('Error renaming presentation:', renameErr.message);
      setRenameError('Failed to rename presentation. Please try again.');
      setRenaming(false);
      return;
    }

    setRenaming(false);
    setRenameTarget(null);
    fetchPresentations();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const { error: deleteErr } = await supabase
      .from('presentations')
      .delete()
      .eq('id', deleteTarget.id);

    if (deleteErr) {
      console.error('Error deleting presentation:', deleteErr.message);
      setDeleteError('Failed to delete presentation. Please try again.');
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setDeleteTarget(null);
    fetchPresentations();
  };

  const filtered = presentations.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <PageHeaderIcon icon={Presentation} />
          <div>
            <h1 className="text-2xl font-bold font-display text-zinc-100">Presentations</h1>
            <p className="text-sm text-zinc-500 mt-1">Create and manage worship presentations.</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          New Presentation
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search presentations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6">
          <Alert message={error} onRetry={fetchPresentations} />
        </div>
      )}

      {/* Content */}
      {error ? null : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Presentation}
            title={search ? "No matching presentations" : "No presentations yet"}
            description={search ? "Try a different search term." : "Create your first worship presentation to get started."}
            action={
              !search && (
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Create Presentation
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id} className="p-5 group hover:border-brand-800/40 transition-all relative">
              {/* Dropdown menu */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === p.id ? null : p.id);
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen === p.id && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(null); navigate(`/presentations/${p.id}/present`); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Present
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openRename(p); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Rename
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(p); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(null); setDeleteError(null); setDeleteTarget(p); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div
                onClick={() => navigate(`/presentations/${p.id}/edit`)}
                className="cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-900/40 to-brand-950/20 border border-brand-800/30 flex items-center justify-center mb-4">
                  <Presentation className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 mb-2 pr-6 truncate">{p.title}</h3>
                <p className="text-xs text-zinc-500 mb-4 line-clamp-2">
                  {p.description || 'No description provided.'}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant={p.status === 'ready' ? 'success' : p.status === 'archived' ? 'default' : 'warning'}>
                    {p.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1" title="Created">
                    <Calendar className="w-3 h-3" />
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1" title="Last updated">
                    <Clock className="w-3 h-3" />
                    {new Date(p.updated_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {p.creator?.full_name ?? 'Unknown'}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => { setCreateOpen(false); setNewTitle(''); setCreateError(null); }}
        title="New Presentation"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setNewTitle(''); setCreateError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim() || creating}>
              {creating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                'Create & Edit'
              )}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {createError && <Alert message={createError} />}
          <Input
            label="Presentation title"
            placeholder="e.g. Sunday Worship — September 15"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus
          />
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal
        open={!!renameTarget}
        onClose={() => { setRenameTarget(null); setRenameError(null); }}
        title="Rename Presentation"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRenameTarget(null); setRenameError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRename} disabled={!renameValue.trim() || renaming}>
              {renaming ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {renameError && <Alert message={renameError} />}
          <Input
            label="Presentation title"
            placeholder="e.g. Sunday Worship — September 15"
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
        title="Delete Presentation"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDeleteTarget(null); setDeleteError(null); }}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <span className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {deleteError && <Alert message={deleteError} />}
          <p className="text-sm text-zinc-400 leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-zinc-200">{deleteTarget?.title}</span>?
            This action cannot be undone, and all slides within this presentation will also be removed.
          </p>
        </div>
      </Modal>
    </div>
  );
}
