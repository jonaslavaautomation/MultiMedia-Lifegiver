import { Palette, Save, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';

interface EditorToolbarProps {
  onOpenBackground: () => void;
  onSave: () => void;
  saving: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Slim persistent utility bar above the canvas — just the actions that
 * aren't tied to a specific tool or selection (Undo/Redo, Background, Save).
 * Adding text/images/elements/Bible/Songs content now lives in the Nav
 * Rail's asset drawers; selection-dependent formatting lives in the
 * floating contextual toolbar that appears above the canvas.
 */
export function EditorToolbar({ onOpenBackground, onSave, saving, onUndo, onRedo, canUndo, canRedo }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Tooltip label="Undo (Ctrl/Cmd+Z)">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="w-3.5 h-3.5" />
        </Button>
      </Tooltip>
      <Tooltip label="Redo (Ctrl/Cmd+Shift+Z)">
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="w-3.5 h-3.5" />
        </Button>
      </Tooltip>

      <div className="w-px h-5 bg-zinc-200 mx-1" />

      <Button variant="ghost" size="sm" onClick={onOpenBackground} title="Slide Background">
        <Palette className="w-3.5 h-3.5" /> Background
      </Button>

      <div className="flex-1" />

      <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
        {saving ? (
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Save
      </Button>
    </div>
  );
}
