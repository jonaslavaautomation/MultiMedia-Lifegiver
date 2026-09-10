import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Presentation, Plus, Copy, Trash2, Search, MoreVertical, Calendar, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import type { PresentationWithCreator } from '@/types';

export function PresentationsPage() {
  const navigate = useNavigate();
  const [presentations, setPresentations] = useState<PresentationWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PresentationWithCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchPresentations = useCallback(async () => {
    const { data, error } = await supabase
      .from('presentations')
      .select('*, creator:profiles!presentations_created_by_fkey(full_name, role)')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching presentations:', error.message);
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

    const { data, error } = await supabase
      .from('presentations')
      .insert({ title: newTitle.trim() })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error creating presentation:', error.message);
      setCreating(false);
      return;
    }

    if (data) {
      navigate(`/presentations/${data.id}/edit`);
    }
  };

  const handleDuplicate = async (p: PresentationWithCreator) => {
    const { data, error } = await supabase
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

    if (error) {
      console.error('Error duplicating presentation:', error.message);
      return;
    }

    setMenuOpen(null);
    if (data) {
      fetchPresentations();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from('presentations')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      console.error('Error deleting presentation:', error.message);
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
        <div>
          <h1 className="text-2xl font-bold font-display text-zinc-100">Presentations</h1>
          <p className="text-sm text-zinc-500 mt-1">Create and manage worship presentations.</p>
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
          className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500/40 focus:border-maroon-600/60"
        />
      </div>

      {/* Content */}
      {loading ? (
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
            <Card key={p.id} className="p-5 group hover:border-maroon-800/40 transition-all relative">
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
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(p); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(null); setDeleteTarget(p); }}
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-maroon-900/40 to-maroon-950/20 border border-maroon-800/30 flex items-center justify-center mb-4">
                  <Presentation className="w-5 h-5 text-maroon-400" />
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
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(p.created_at).toLocaleDateString()}
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
        onClose={() => { setCreateOpen(false); setNewTitle(''); }}
        title="New Presentation"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setNewTitle(''); }}>
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
        <Input
          label="Presentation title"
          placeholder="e.g. Sunday Worship — September 15"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          autoFocus
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Presentation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
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
        <p className="text-sm text-zinc-400 leading-relaxed">
          Are you sure you want to delete <span className="font-semibold text-zinc-200">{deleteTarget?.title}</span>?
          This action cannot be undone, and all slides within this presentation will also be removed.
        </p>
      </Modal>
    </div>
  );
}
