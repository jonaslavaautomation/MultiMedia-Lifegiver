import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Church } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { MobileNav } from '@/components/layout/MobileNav';

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
      <header className="sticky top-0 z-30 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-900 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-200"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-maroon-600 to-maroon-800 flex items-center justify-center">
              <Church className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold font-display text-zinc-100">LifeGiver</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-maroon-700 to-maroon-900 flex items-center justify-center text-xs font-bold text-white">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-zinc-200">{profile?.full_name ?? 'User'}</span>
              <span className="text-[10px] text-zinc-500 capitalize">{profile?.role ?? 'media'}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-zinc-400 hover:text-red-400">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
    </>
  );
}
