import { Palette, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EditorToolbarProps {
  onOpenBackground: () => void;
  onSave: () => void;
  saving: boolean;
}

/**
 * Slim persistent utility bar above the canvas — just the actions that
 * aren't tied to a specific tool or selection (Background, Save). Adding
 * text/images/elements/Bible/Songs content now lives in the Nav Rail's
 * asset drawers; selection-dependent formatting lives in the floating
 * contextual toolbar that appears above the canvas.
 */
export function EditorToolbar({ onOpenBackground, onSave, saving }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
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
