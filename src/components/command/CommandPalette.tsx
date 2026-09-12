import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { useGlobalSearchData } from '@/hooks/useGlobalSearchData';
import { buildPaletteResults, type PaletteResult } from '@/lib/commandPaletteResults';
import { COMMAND_PALETTE_OPEN_EVENT } from '@/lib/commandPaletteEvents';

/**
 * Global Cmd/Ctrl+K search — mounted once in AppLayout so it's available on
 * every authenticated page. Navigation-only: selecting a result takes you
 * there (open the editor, jump to a Bible reference, land on a pre-filtered
 * Media/Templates list) rather than pushing anything to a live session.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data, fetch } = useGlobalSearchData();

  // Open via Cmd/Ctrl+K from anywhere, or via the Header's search button.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    void fetch();
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, fetch]);

  const results = useMemo(() => buildPaletteResults(query, data), [query, data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleSelect(result: PaletteResult) {
    setOpen(false);
    switch (result.kind) {
      case 'bible':
        navigate('/bible', { state: { query: query.trim() } });
        break;
      case 'presentation':
        navigate(`/presentations/${result.id}/edit`);
        break;
      case 'song':
        navigate(`/songs/${result.id}`);
        break;
      case 'media':
        navigate(`/media?q=${encodeURIComponent(result.title)}`);
        break;
      case 'template':
        navigate(`/templates?q=${encodeURIComponent(result.title)}`);
        break;
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const result = results[activeIndex];
      if (result) handleSelect(result);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search presentations, songs, Bible verses, media, templates…"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
          />
          <kbd className="hidden sm:inline text-[10px] text-zinc-600 border border-zinc-700 rounded px-1.5 py-0.5 shrink-0">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500 text-center">
              {query.trim() ? 'No results.' : 'Start typing to search…'}
            </p>
          ) : (
            results.map((result, index) => {
              const Icon = result.icon;
              const active = index === activeIndex;
              return (
                <button
                  key={`${result.kind}-${result.id}`}
                  type="button"
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    active ? 'bg-brand-950/40' : 'hover:bg-zinc-800/60'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-gradient-to-br from-brand-500 to-brand-700' : 'bg-zinc-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-zinc-100 truncate">{result.title}</span>
                    {result.subtitle && <span className="block text-xs text-zinc-500 truncate">{result.subtitle}</span>}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-600">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" /> Select
          </span>
          <span>↑↓ Navigate</span>
        </div>
      </div>
    </div>
  );
}
