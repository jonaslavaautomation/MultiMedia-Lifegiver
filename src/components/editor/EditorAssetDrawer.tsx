import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { EditorPanelKind } from '@/components/editor/EditorNavRail';

const PANEL_TITLES: Record<EditorPanelKind, string> = {
  templates: 'Templates',
  bible: 'Bible Verses',
  songs: 'Worship Songs',
  elements: 'Elements',
  text: 'Text',
  media: 'Media & Uploads',
  brand: 'Brand',
};

interface EditorAssetDrawerProps {
  activePanel: EditorPanelKind | null;
  onClose: () => void;
  children: ReactNode;
}

/** Collapsible secondary panel next to the Nav Rail — slides open/closed with the active tool's content. */
export function EditorAssetDrawer({ activePanel, onClose, children }: EditorAssetDrawerProps) {
  return (
    <AnimatePresence initial={false}>
      {activePanel && (
        <motion.div
          key={activePanel}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 288, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="shrink-0 overflow-hidden"
        >
          <div className="w-72 h-full rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 shrink-0">
              <h3 className="text-sm font-semibold text-zinc-100">{PANEL_TITLES[activePanel]}</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
