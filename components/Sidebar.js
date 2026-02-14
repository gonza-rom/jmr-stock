'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Package, ShoppingCart, Users, FolderTree, TrendingUp,
  DollarSign, BarChart3, Moon, Sun, LogOut, UserCircle,
  ChevronRight, Menu, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
  const pathname  = usePathname();
  const { user, logout, isAdmin, loading } = useAuth();
  const [expanded,    setExpanded]    = useState(false);
  const [darkMode,    setDarkMode]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('darkMode', next.toString());
    next
      ? document.documentElement.classList.add('dark')
      : document.documentElement.classList.remove('dark');
  };

  const getLinks = () => {
    const base = [
      { href: '/',            label: 'Dashboard',   icon: TrendingUp  },
      { href: '/ventas',      label: 'Ventas',       icon: DollarSign  },
      { href: '/productos',   label: 'Productos',    icon: Package     },
    ];
    if (isAdmin()) {
      return [
        ...base,
        { href: '/movimientos',  label: 'Movimientos',  icon: ShoppingCart },
        { href: '/categorias',   label: 'Categorías',   icon: FolderTree   },
        { href: '/proveedores',  label: 'Proveedores',  icon: Users        },
        { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3    },
        { href: '/usuarios',     label: 'Usuarios',     icon: UserCircle   },
      ];
    }
    return base;
  };

  if (loading || !user) return null;

  const links = getLinks();

  // ── Contenido del sidebar (reutilizado en desktop y mobile) ──
  const NavContent = ({ forceExpanded = false }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-3 py-5 border-b border-white/10 ${forceExpanded || expanded ? 'justify-start' : 'justify-center'}`}>
        <div className="relative w-9 h-9 flex-shrink-0 bg-white rounded-lg p-1 shadow">
          <Image src="/logo-jmr.png" alt="JMR" fill className="object-contain" priority />
        </div>
        {(forceExpanded || expanded) && (
          <div className="overflow-hidden">
            <p className="text-xs text-green-300 font-semibold tracking-widest uppercase leading-none">Marroquinería</p>
            <p className="text-lg font-black text-white leading-tight tracking-tight">JMR</p>
          </div>
        )}
      </div>

      {/* Links */}
      <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              title={!forceExpanded && !expanded ? label : undefined}
              className={`
                flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg transition-all duration-150 group relative
                ${active
                  ? 'bg-white/15 text-white font-semibold shadow-sm'
                  : 'text-green-100 hover:bg-white/10 hover:text-white'}
              `}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-green-300 rounded-r-full" />
              )}
              <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-green-300' : 'text-green-200 group-hover:text-white'}`} />
              {(forceExpanded || expanded) && (
                <span className="text-sm truncate">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`border-t border-white/10 px-3 py-3 space-y-1`}>
        {/* Info usuario */}
        {(forceExpanded || expanded) && (
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/5 mb-2">
            <div className="w-7 h-7 rounded-full bg-green-400 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-green-900">
                {user?.nombre?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{user?.nombre}</p>
              <p className="text-xs text-green-300 truncate">
                {user?.rol === 'ADMINISTRADOR' ? 'Admin' : 'Empleado'}
              </p>
            </div>
          </div>
        )}

        {/* Botones */}
        <div className={`flex ${forceExpanded || expanded ? 'gap-1' : 'flex-col gap-1 items-center'}`}>
          <button
            onClick={toggleDarkMode}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            className="flex items-center justify-center gap-2 p-2 rounded-lg text-green-100 hover:bg-white/10 hover:text-white transition-colors flex-1"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {(forceExpanded || expanded) && <span className="text-xs">Tema</span>}
          </button>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="flex items-center justify-center gap-2 p-2 rounded-lg text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-colors flex-1"
          >
            <LogOut className="w-4 h-4" />
            {(forceExpanded || expanded) && <span className="text-xs">Salir</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`
          hidden lg:flex flex-col fixed left-0 top-0 h-full z-40
          bg-jmr-primary dark:bg-gray-900
          border-r border-white/10
          transition-all duration-200 ease-in-out
          ${expanded ? 'w-56' : 'w-16'}
          shadow-xl
        `}
      >
        <NavContent />
      </aside>

      {/* ── MOBILE TOPBAR ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-jmr-primary dark:bg-gray-900 shadow-lg h-14 flex items-center justify-between px-4">
        <button onClick={() => setMobileOpen(true)} className="p-1.5 text-white rounded-md hover:bg-white/10 transition-colors">
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <div className="relative w-7 h-7 bg-white rounded-md p-0.5">
            <Image src="/logo-jmr.png" alt="JMR" fill className="object-contain" priority />
          </div>
          <span className="text-white font-bold text-lg">JMR</span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={toggleDarkMode} className="p-1.5 text-white rounded-md hover:bg-white/10 transition-colors">
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={logout} className="p-1.5 text-red-300 rounded-md hover:bg-red-500/20 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="lg:hidden fixed left-0 top-0 h-full w-64 z-50 bg-jmr-primary dark:bg-gray-900 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-white rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent forceExpanded={true} />
          </div>
        </>
      )}
    </>
  );
}