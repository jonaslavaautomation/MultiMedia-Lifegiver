import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Presentation, Pencil, Calendar, Clock, User, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { EditorWorkspace } from '@/components/editor/EditorWorkspace';
import type { PresentationWithCreator } from '@/types';

export function PresentationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<PresentationWithCreator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const fetchPresentation = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('presentations')
      .select('*, creator:profiles!presentations_created_by_fkey(full_name, role)')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching presentation:', fetchError.message);
      setError('Failed to load this presentation. Please try again.');
      setLoading(false);
      return;
    }

    setPresentation(data as PresentationWithCreator | null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchPresentation();
  }, [fetchPresentation]);

  const openRename = () => {
    if (!presentation) return;
    setRenameError(null);
    setRenameValue(presentation.title);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    if (!presentation || !renameValue.trim()) return;
    setRenaming(true);
    setRenameError(null);

    const { error: renameErr } = await supabase
      .from('presentations')
      .update({ title: renameValue.trim() })
      .eq('id', presentation.id);

    if (renameErr) {
      console.error('Error renaming presentation:', renameErr.message);
      setRenameError('Failed to rename presentation. Please try again.');
      setRenaming(false);
      return;
    }

    setRenaming(false);
    setRenameOpen(false);
    fetchPresentation();
  };

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-zinc-900/60 rounded-lg animate-pulse mb-6" />
        <div className="h-96 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
        <Button variant="ghost" size="icon" onClick={() => navigate('/presentations')} className="mb-6">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Alert message={error} onRetry={fetchPresentation} />
      </div>
    );
  }

  if (!presentation) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Presentation className="w-12 h-12 text-zinc-700 mb-4" />
          <h2 className="text-lg font-semibold text-zinc-300 mb-1">Presentation not found</h2>
          <p className="text-sm text-zinc-500 mb-4">This presentation may have been deleted.</p>
          <Button variant="secondary" onClick={() => navigate('/presentations')}>
            <ArrowLeft className="w-4 h-4" /> Back to Presentations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8">
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/presentations')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 group">
              <h1 className="text-xl font-bold font-display text-zinc-100 truncate">{presentation.title}</h1>
              <button
                onClick={openRename}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all shrink-0"
                title="Rename presentation"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <Badge variant={presentation.status === 'ready' ? 'success' : 'warning'}>
                {presentation.status}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {presentation.description || 'No description'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1" title="Created">
                <Calendar className="w-3 h-3" />
                Created {new Date(presentation.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1" title="Last updated">
                <Clock className="w-3 h-3" />
                Updated {new Date(presentation.updated_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {presentation.creator?.full_name ?? 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => navigate(`/presentations/${presentation.id}/present`)}
          className="shrink-0 animate-pulse-glow-lime"
        >
          <Play className="w-4 h-4" /> Go Live
        </Button>
      </div>

      {/* Rename modal */}
      <Modal
        open={renameOpen}
        onClose={() => { setRenameOpen(false); setRenameError(null); }}
        title="Rename Presentation"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setRenameOpen(false); setRenameError(null); }}>
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
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
            autoFocus
          />
        </div>
      </Modal>
    </div>

    {/* Slide editor — intentionally not constrained to max-w-7xl, it needs more room. */}
    <div className="max-w-[1600px] mx-auto">
      <EditorWorkspace presentationId={presentation.id} />
    </div>
    </div>
  );
}
