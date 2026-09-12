import { useState } from 'react';
import { Star } from 'lucide-react';
import { MotionBackgroundPlayer } from '@/components/motion/MotionBackgroundPlayer';
import type { MotionPreset } from '@/types/motion';

interface MotionCardProps {
  preset: MotionPreset;
  favorite: boolean;
  onToggleFavorite: () => void;
  onSelect: () => void;
}

/**
 * One tile in the Motion Library grid. Renders a single static frame at
 * rest and only starts the real animation on hover/focus — with 54 presets
 * in the grid, animating all of them at once would mean 54 concurrent rAF
 * loops for no benefit; hover-to-preview (the same pattern stock-footage
 * and motion-pack sites use) keeps this cheap while still giving a true,
 * accurate preview of exactly what the motion looks like — not a static
 * mockup image standing in for it.
 */
export function MotionCard({ preset, favorite, onToggleFavorite, onSelect }: MotionCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group relative aspect-video rounded-xl overflow-hidden border border-zinc-200/80 hover:border-brand-600/60 transition-all cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      title={preset.description}
    >
      <MotionBackgroundPlayer preset={preset} animate={hovered} />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
        className={`absolute top-1.5 right-1.5 p-1 rounded-full transition-all ${
          favorite ? 'bg-black/50 text-vanilla' : 'bg-black/40 text-zinc-100 opacity-0 group-hover:opacity-100'
        }`}
      >
        <Star className="w-3.5 h-3.5" fill={favorite ? 'currentColor' : 'none'} />
      </button>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-4 pb-1.5">
        <p className="text-[11px] font-medium text-zinc-100 truncate">{preset.name}</p>
      </div>
    </div>
  );
}
