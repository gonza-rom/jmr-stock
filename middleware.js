import { NextResponse } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login'];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Permitir todas las rutas de API
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Permitir archivos estáticos
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // archivos con extensión
  ) {
    return NextResponse.next();
  }

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Para rutas de páginas, verificar si hay token
  const token = request.cookies.get('auth-token')?.value;

  // Si no hay token, redirigir al login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Si hay token, permitir acceso
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo-jmr.png|.*\\..*$).*)',
  ],
};