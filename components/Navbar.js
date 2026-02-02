'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Package, ShoppingCart, Users, FolderTree, TrendingUp, DollarSign, BarChart3, Moon, Sun, Menu, X } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Cargar preferencia de modo oscuro
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const links = [
    { href: '/', label: 'Dashboard', icon: TrendingUp },
    { href: '/ventas', label: 'Ventas', icon: DollarSign },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/categorias', label: 'Categorías', icon: FolderTree },
    { href: '/proveedores', label: 'Proveedores', icon: Users },
    { href: '/movimientos', label: 'Movimientos', icon: ShoppingCart },
    { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  ];

  return (
    <nav className="bg-jmr-primary dark:bg-gray-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0">
            <div className="relative w-10 h-10 bg-white rounded-lg p-1">
              <Image
                src="/logo-jmr.png"
                alt="JMR"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold">Marroquinería</span>
              <span className="text-2xl font-bold text-jmr-accent ml-2">JMR</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-jmr-secondary dark:bg-gray-800 font-semibold'
                      : 'hover:bg-jmr-secondary/80 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Botones de la derecha */}
          <div className="flex items-center space-x-2">
            {/* Toggle modo oscuro */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-md hover:bg-jmr-secondary dark:hover:bg-gray-800 transition-colors"
              title={darkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Menú móvil */}
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              className="lg:hidden p-2 rounded-md hover:bg-jmr-secondary dark:hover:bg-gray-800 transition-colors"
            >
              {menuAbierto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuAbierto && (
          <div className="lg:hidden pb-4 space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuAbierto(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                    isActive
                      ? 'bg-jmr-secondary dark:bg-gray-800 font-semibold'
                      : 'hover:bg-jmr-secondary/80 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}