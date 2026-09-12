import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLiveChannel } from '@/hooks/useLiveChannel';
import { extractOverlayText } from '@/lib/overlayContent';
import type { LiveState } from '@/types/live';

/**
 * NDI/OBS transparent keyer overlay — meant to be captured as an OBS/vMix
 * Browser Source (with its background set to transparent) or via an NDI
 * virtual-display tool, composited over a live camera feed. Shows only the
 * current slide's text (lyrics, a scripture reference, an announcement
 * line) as an animated lower-third card — never the slide's own
 * background — so it keys cleanly over video. A slide with no text (a
 * pure image/video background) simply shows nothing.
 */
export function OverlayPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LiveState | null>(null);
  const { post, lastMessage } = useLiveChannel(id ?? '');

  useEffect(() => {
    post({ type: 'request-state' });
  }, [post]);

  useEffect(() => {
    if (lastMessage?.type === 'state') setState(lastMessage.state);
  }, [lastMessage]);

  // Force a truly transparent page — the app's global body background
  // would otherwise defeat an OBS Browser Source's transparency.
  useEffect(() => {
    const { body, documentElement: html } = document;
    const prevBody = body.style.background;
    const prevHtml = html.style.background;
    body.style.background = 'transparent';
    html.style.background = 'transparent';
    return () => {
      body.style.background = prevBody;
      html.style.background = prevHtml;
    };
  }, []);

  const overlayText = !state?.blackout ? extractOverlayText(state?.currentContent) : null;
  // Key the animation on the actual text, not just slide index, so the
  // enter/exit only fires when what's displayed actually changes.
  const animKey = overlayText ? `${overlayText.primary}|${overlayText.caption ?? ''}` : 'empty';

  return (
    <div className="fixed inset-0 bg-transparent flex items-end justify-center pb-[8%] pointer-events-none">
      <AnimatePresence mode="wait">
        {overlayText && (
          <motion.div
            key={animKey}
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-w-4xl mx-4 rounded-2xl bg-zinc-950/80 backdrop-blur-md border border-brand-500/30 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.6)] overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-brand-400 to-leaf-500" />
            <div className="px-8 py-5 pl-9 text-center">
              <p className="text-2xl lg:text-3xl font-bold font-display text-white leading-snug">
                {overlayText.primary}
              </p>
              {overlayText.caption && (
                <p className="mt-2 text-sm lg:text-base italic text-brand-200/90">{overlayText.caption}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
