import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/productos/barcode?codigo=123456789
// Busca un producto por su código de barras
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigo = searchParams.get('codigo');

    if (!codigo || codigo.trim() === '') {
      return NextResponse.json({ error: 'El parámetro codigo es requerido' }, { status: 400 });
    }

    const producto = await prisma.producto.findUnique({
      where: { codigoBarras: codigo.trim() },
      include: {
        categoria: true,
        proveedor: true,
      },
    });

    if (!producto) {
      return NextResponse.json({ error: 'No se encontró producto con ese código de barras' }, { status: 404 });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al buscar por código de barras:', error);
    return NextResponse.json({ error: 'Error en la búsqueda' }, { status: 500 });
  }
}