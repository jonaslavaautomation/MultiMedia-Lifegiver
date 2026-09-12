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
        className={`group flex items-center gap-3 px-2.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-gradient-to-r from-lime-500/15 to-transparent text-zinc-900 border-l-2 border-lime-500'
            : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 border-l-2 border-transparent'
        }`}
      >
        <span
          className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${
            active
              ? 'bg-lime-500 shadow-md shadow-lime-500/30'
              : 'bg-zinc-100 border border-zinc-200 group-hover:border-lime-400/50 group-hover:bg-zinc-200'
          }`}
        >
          <Icon
            className={`w-4 h-4 transition-colors ${active ? 'text-obsidian' : 'text-zinc-500 group-hover:text-zinc-700'}`}
            strokeWidth={2}
          />
        </span>
        {item.label}
      </NavLink>
    );
  };

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-zinc-200 h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-zinc-200">
        <div className="rounded-xl bg-white border border-lime-300/70 shadow-sm p-2.5">
          <img src="/lifegiver-logo.png" alt="LifeGiver Davao" className="w-full h-auto object-contain rounded-lg" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        <p className="px-3.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
          Main
        </p>
        {mainNav.map(renderLink)}

        {isAdmin && (
          <>
            <p className="px-3.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mt-5 mb-1">
              Administration
            </p>
            {adminNav.map(renderLink)}
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-zinc-200">
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-canvas-subtle border border-zinc-200">
          <div className="w-8 h-8 rounded-full bg-lime-500 flex items-center justify-center text-xs font-bold text-obsidian shrink-0">
            {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-zinc-800 truncate">
              {profile?.full_name ?? 'User'}
            </span>
            <span className="text-[10px] text-zinc-500 capitalize">{profile?.role ?? 'media'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
