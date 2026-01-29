'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Package, ShoppingCart, Users, FolderTree, TrendingUp } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard', icon: TrendingUp },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/categorias', label: 'Categorías', icon: FolderTree },
    { href: '/proveedores', label: 'Proveedores', icon: Users },
    { href: '/movimientos', label: 'Movimientos', icon: ShoppingCart },
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Package className="w-8 h-8" />
            <span className="text-xl font-bold">JMR Stock</span>
          </Link>
          
          <div className="flex space-x-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-700 font-semibold'
                      : 'hover:bg-blue-500'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}