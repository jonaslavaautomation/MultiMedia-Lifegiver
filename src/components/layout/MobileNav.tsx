import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Presentation,
  Music4,
  BookOpen,
  Image,
  LayoutTemplate,
  Users,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Presentations', to: '/presentations', icon: Presentation },
  { label: 'Songs', to: '/songs', icon: Music4 },
  { label: 'Bible', to: '/bible', icon: BookOpen },
  { label: 'Media', to: '/media', icon: Image },
  { label: 'Templates', to: '/templates', icon: LayoutTemplate },
];

const adminNav: NavItem[] = [
  { label: 'Users', to: '/users', icon: Users },
  { label: 'Settings', to: '/settings', icon: Settings },
];

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();

  if (!open) return null;

  const renderLink = (item: NavItem) => {
    const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onClose}
        className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-brand-900/40 text-zinc-100 border-l-2 border-brand-500'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
        }`}
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
            active ? 'bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-950/50' : 'bg-zinc-900 border border-zinc-800/80'
          }`}
        >
          <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-500'}`} />
        </span>
        {item.label}
      </NavLink>
    );
  };

  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 h-16 border-b border-zinc-900">
          <div className="rounded-lg bg-white shadow-lg shadow-black/30 p-1.5 shrink-0">
            <img src="/lifegiver-logo.png" alt="LifeGiver Davao" className="h-8 w-auto object-contain" />
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {mainNav.map(renderLink)}
          {isAdmin && (
            <>
              <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mt-4 mb-1">
                Administration
              </p>
              {adminNav.map(renderLink)}
            </>
          )}
        </nav>
        <div className="px-3 py-4 border-t border-zinc-900">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-900/40">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-700 to-brand-900 flex items-center justify-center text-xs font-bold text-white">
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-zinc-200 truncate">{profile?.full_name ?? 'User'}</span>
              <span className="text-[10px] text-zinc-500 capitalize">{profile?.role ?? 'media'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
