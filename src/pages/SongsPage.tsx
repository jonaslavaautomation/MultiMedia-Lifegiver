import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Music4, Plus, Copy, Trash2, Search, MoreVertical, Calendar, Clock, User, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { PageHeaderIcon } from '@/components/ui/PageHeaderIcon';
import type { SongWithCreator } from '@/types';

export function SongsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [songs, setSongs] = useState<SongWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');

  // Arriving from the Command Palette with a search term already chosen.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearch(q);
  }, [searchParams]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SongWithCreator | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SongWithCreator | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('songs')
      .select('*, creator:profiles!songs_created_by_fkey(full_name, role)')
      .order('title', { ascending: true });

    if (fetchError) {
      console.error('Error fetching songs:', fetchError.message);
      setError('Failed to load songs. Please try again.');
      setLoading(false);
      return;
    }

    setSongs((data as SongWithCreator[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError(null);

    const { data, error: createErr } = await supabase
      .from('songs')
      .insert({ title: newTitle.trim(), category: newCategory.trim() || null, lyrics: { sections: [] } })
      .select('id')
      .maybeSingle();

    if (createErr || !data) {
      console.error('Error creating song:', createErr?.message);
      setCreateError('Failed to create song. Please try again.');
      setCreating(false);
      return;
    }

    navigate(`/songs/${data.id}`);
  };

  const handleDuplicate = async (song: SongWithCreator) => {
    setMenuOpen(null);
    setError(null);

    const { error: dupError } = await supabase.from('songs').insert({
      title: `${song.title} (Copy)`,
      author: song.author,
      category: song.category,
      key: song.key,
      tempo: song.tempo,
      lyrics: song.lyrics,
    });

    if (dupError) {
      console.error('Error duplicating song:', dupError.message);
      setError('Failed to duplicate song. Please try again.');
      return;
    }

    fetchSongs();
  };

  const openRename = (song: SongWithCreator) => {
    setMenuOpen(null);
    setRenameError(null);
    setRenameValue(song.title);
    setRenameTarget(song);
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    setRenameError(null);

    const { error: renameErr } = await supabase
      .from('songs')
      .update({ title: renameValue.trim() })
      .eq('id', renameTarget.id);

    if (renameErr) {
      console.error('Error renaming song:', renameErr.message);
      setRenameError('Failed to rename song. Please try again.');
      setRenaming(false);
      return;
    }

    setRenaming(false);
    setRenameTarget(null);
    fetchSongs();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);

    const { error: deleteErr } = await supabase.from('songs').delete().eq('id', deleteTarget.id);

    if (deleteErr) {
      console.error('Error deleting song:', deleteErr.message);
      setDeleteError('Failed to delete song. Please try again.');
      setDeleting(false);
      return;
    }

    setDeleting(false);
    setDeleteTarget(null);
    fetchSongs();
  };

  const categories = Array.from(new Set(songs.map((s) => s.category).filter((c): c is string => !!c))).sort();

  const filtered = songs.filter((s) => {
    if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
    return (
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.author ?? '').toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <PageHeaderIcon icon={Music4} />
          <div>
            <h1 className="text-2xl font-bold font-display text-zinc-100">Songs</h1>
            <p className="text-sm text-zinc-500 mt-1">Manage your worship song library with lyrics and metadata.</p>
          </div>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          New Song
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6 relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search songs or artists…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl bg-zinc-900/80 border border-zinc-700/80 text-zinc-100 placeholder-zinc-500 pl-11 pr-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
        />
      </div>

      {categories.length > 0 && (
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mr-1">Category</span>
          <Button variant={categoryFilter === 'all' ? 'secondary' : 'ghost'} size="sm" onClick={() => setCategoryFilter('all')}>
            All
          </Button>
          {categories.map((c) => (
            <Button key={c} variant={categoryFilter === c ? 'secondary' : 'ghost'} size="sm" onClick={() => setCategoryFilter(c)}>
              {c}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6">
          <Alert message={error} onRetry={fetchSongs} />
        </div>
      )}

      {/* Content */}
      {error ? null : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Music4}
            title={search ? 'No matching songs' : 'No songs yet'}
            description={search ? 'Try a different search term.' : 'Add your first worship song to get started.'}
            action={
              !search && (
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Song
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((song) => (
            <Card key={song.id} className="p-5 group hover:border-brand-800/40 transition-all relative">
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === song.id ? null : song.id);
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen === song.id && (
                  <>
                    <div className="fixed inset-0 z-0" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
                      <button
                        onClick={(e) => { e.stopPropagation(); openRename(song); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Rename
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(song); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(null); setDeleteError(null); setDeleteTarget(song); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              <div onClick={() => navigate(`/songs/${song.id}`)} className="cursor-pointer">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-900/40 to-brand-950/20 border border-brand-800/30 flex items-center justify-center mb-4">
                  <Music4 className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100 mb-1 pr-6 truncate">{song.title}</h3>
                <p className="text-xs text-zinc-500 mb-3 truncate">{song.author || 'Unknown artist'}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {song.category && <Badge variant="success">{song.category}</Badge>}
                  {song.key && <Badge variant="info">Key: {song.key}</Badge>}
                  {song.tempo && <Badge variant="default">{song.tempo}</Badge>}
                  <Badge variant="default">{song.lyrics?.sections?.length ?? 0} sections</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                  <span className="flex items-center gap-1" title="Created">
                    <Calendar className="w-3 h-3" />
                    {new Date(song.created_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1" title="Last updated">
                    <Clock className="w-3 h-3" />
                    {new Date(song.updated_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {song.creator?.full_name ?? 'Unknown'}
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
        onClose={() => { setCreateOpen(false); setNewTitle(''); setNewCategory(''); setCreateError(null); }}
        title="New Song"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); setNewTitle(''); setNewCategory(''); setCreateError(null); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim() || creating}>
              {creating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating…
                </>
              ) : (
                'Create & Open'
              )}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {createError && <Alert message={createError} />}
          <Input
            label="Song title"
            placeholder="e.g. Amazing Grace"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus
          />
          <Input
            label="Category (optional)"
            placeholder="e.g. Worship, Hymn, Christmas"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          />
        </div>
      </Modal>

      {/* Rename modal */}
      <Modal
        open={!!renameTarget}
        onClose={() => { setRenameTarget(null); setRenameError(null); }}
        title="Rename Song"
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
            label="Song title"
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
        title="Delete Song"
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
            Are you sure you want to delete <span className="font-semibold text-zinc-200">{deleteTarget?.title}</span>? This action cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}
