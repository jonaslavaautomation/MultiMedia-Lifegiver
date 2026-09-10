import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Presentation, Layers, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { Presentation as PresentationType } from '@/types';

export function PresentationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [presentation, setPresentation] = useState<PresentationType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    async function fetchPresentation() {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) {
        console.error('Error fetching presentation:', error.message);
        setLoading(false);
        return;
      }

      setPresentation(data as PresentationType | null);
      setLoading(false);
    }

    fetchPresentation();
  }, [id]);

  if (loading) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-zinc-900/60 rounded-lg animate-pulse mb-6" />
        <div className="h-96 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl animate-pulse" />
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
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
      {/* Breadcrumb header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => navigate('/presentations')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold font-display text-zinc-100 truncate">{presentation.title}</h1>
              <Badge variant={presentation.status === 'ready' ? 'success' : 'warning'}>
                {presentation.status}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {presentation.description || 'No description'}
            </p>
          </div>
        </div>
      </div>

      {/* Editor placeholder */}
      <div className="flex flex-col items-center justify-center text-center py-20 lg:py-32 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-maroon-900/40 to-maroon-950/20 border border-maroon-800/30 flex items-center justify-center mb-6">
          <Layers className="w-10 h-10 text-maroon-500" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-bold font-display text-zinc-100 mb-2">Presentation Editor</h2>
        <p className="text-sm text-zinc-500 max-w-md leading-relaxed mb-2">
          The full slide editor with drag-and-drop design tools, live preview, and
          worship lyrics integration will be available in Phase 3.
        </p>
        <div className="flex items-center gap-1.5 mt-4 text-xs text-maroon-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Coming in Phase 3</span>
        </div>
      </div>
    </div>
  );
}
