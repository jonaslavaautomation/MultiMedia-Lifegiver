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
  Church,
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

export function Sidebar() {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();

  const renderLink = (item: NavItem) => {
    const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-gradient-to-r from-maroon-900/50 to-transparent text-zinc-100 border-l-2 border-maroon-500'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border-l-2 border-transparent'
        }`}
      >
        <Icon
          className={`w-[18px] h-[18px] transition-colors ${active ? 'text-maroon-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}
          strokeWidth={2}
        />
        {item.label}
      </NavLink>
    );
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-zinc-950/95 border-r border-zinc-900 h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-zinc-900">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-maroon-600 to-maroon-800 flex items-center justify-center shadow-lg shadow-maroon-950/40">
          <Church className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold font-display text-zinc-100 tracking-wide">LifeGiver</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-medium">Media Studio</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        <p className="px-3.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1">
          Main
        </p>
        {mainNav.map(renderLink)}

        {isAdmin && (
          <>
            <p className="px-3.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mt-5 mb-1">
              Administration
            </p>
            {adminNav.map(renderLink)}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-900">
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-zinc-900/40">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-maroon-700 to-maroon-900 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-zinc-200 truncate">
              {profile?.full_name ?? 'User'}
            </span>
            <span className="text-[10px] text-zinc-500 capitalize">{profile?.role ?? 'media'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
