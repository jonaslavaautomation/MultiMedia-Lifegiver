import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { MobileNav } from '@/components/layout/MobileNav';
import { openCommandPalette } from '@/lib/commandPaletteEvents';

export function Header() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="lg:hidden text-sm font-bold font-display text-zinc-900">LifeGiver</span>
          <button
            onClick={openCommandPalette}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-canvas-subtle border border-zinc-200 text-zinc-500 hover:text-zinc-700 hover:border-lime-400/50 transition-all text-sm"
          >
            <Search className="w-4 h-4" />
            <span>Search…</span>
            <kbd className="ml-3 text-[10px] border border-zinc-300 rounded px-1.5 py-0.5 text-zinc-500">⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-canvas-subtle border border-zinc-200">
            <div className="w-7 h-7 rounded-full bg-lime-500 flex items-center justify-center text-xs font-bold text-obsidian">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-zinc-800">{profile?.full_name ?? 'User'}</span>
              <span className="text-[10px] text-zinc-500 capitalize">{profile?.role ?? 'media'}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-zinc-500 hover:text-red-500">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
