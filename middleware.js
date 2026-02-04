import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || '4abd263ad826eabf286685c3ecafac8e8b56c451c9397368cce4a7ea60c32001';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

// Rutas de API que NO necesitan verificación de autenticación
// (las dejamos abiertas para que funcionen internamente)
const PUBLIC_API_ROUTES = [
  '/api/productos',
  '/api/categorias',
  '/api/proveedores',
  '/api/movimientos',
  '/api/ventas',
  '/api/estadisticas',
  '/api/precios',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Permitir todas las rutas de API (excepto las de auth)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    // Las APIs de productos, categorías, etc. funcionan sin middleware
    return NextResponse.next();
  }

  // Para rutas de páginas (no API), verificar autenticación
  if (!pathname.startsWith('/api/')) {
    const token = request.cookies.get('auth-token')?.value;

    // Si no hay token, redirigir al login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar si el token es válido
    try {
      jwt.verify(token, JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      // Token inválido, redirigir al login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo-jmr.png).*)',
  ],
};