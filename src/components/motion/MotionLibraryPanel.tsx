import { useMemo, useState } from 'react';
import { Search, Star, Sparkles } from 'lucide-react';
import { MOTION_CATEGORIES, type MotionCategory } from '@/types/motion';
import { searchMotionPresets } from '@/lib/motionLibrary';
import { useMotionFavorites } from '@/hooks/useMotionFavorites';
import { MotionCard } from '@/components/motion/MotionCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface MotionLibraryPanelProps {
  onSelect: (motionId: string) => void;
  className?: string;
}

type CategoryFilter = MotionCategory | 'all';

/**
 * The Motion Background Library browser: search, category collections
 * (Worship / Prayer / Bible / Sermon / Countdown / Announcement),
 * favorites, and a live-preview grid — embedded in BackgroundPickerModal's
 * "Motion" tab, and reusable anywhere else a motion needs picking.
 */
export function MotionLibraryPanel({ onSelect, className = '' }: MotionLibraryPanelProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { favoriteIds, toggleFavorite } = useMotionFavorites();

  const results = useMemo(
    () => searchMotionPresets({ query: search, category, favoriteIds, favoritesOnly }),
    [search, category, favoriteIds, favoritesOnly]
  );

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search motions… (e.g. “bokeh”, “countdown”, “warm”)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-white/80 border border-zinc-300/80 text-zinc-900 placeholder-zinc-500 pl-9 pr-3 py-2 text-xs transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-600/60"
          />
        </div>
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          title="Show favorites only"
          className={`shrink-0 p-2 rounded-lg border transition-all ${
            favoritesOnly ? 'bg-vanilla border-vanilla/70 text-obsidian' : 'border-zinc-300/80 text-zinc-500 hover:border-zinc-400'
          }`}
        >
          <Star className="w-3.5 h-3.5" fill={favoritesOnly ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <CategoryChip label="All" active={category === 'all'} onClick={() => setCategory('all')} />
        {MOTION_CATEGORIES.map((c) => (
          <CategoryChip key={c.value} label={c.label} active={category === c.value} onClick={() => setCategory(c.value)} />
        ))}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={favoritesOnly ? 'No favorites yet' : 'No matching motions'}
          description={favoritesOnly ? 'Star a motion to save it here for quick access.' : 'Try a different search term or collection.'}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
          {results.map((preset) => (
            <MotionCard
              key={preset.id}
              preset={preset}
              favorite={favoriteIds.has(preset.id)}
              onToggleFavorite={() => void toggleFavorite(preset.id)}
              onSelect={() => onSelect(preset.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active ? 'bg-brand-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}
