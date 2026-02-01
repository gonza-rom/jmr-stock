import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/precios/:id
// Retorna el producto y su historial completo de cambios de precio
export async function GET(request, context) {
  try {
    const params = await context.params;
    const productoId = parseInt(params.id);

    if (isNaN(productoId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { id: true, nombre: true, precio: true },
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const historial = await prisma.precioHistorico.findMany({
      where: { productoId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ producto, historial });
  } catch (error) {
    console.error('Error al obtener historial de precios:', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}