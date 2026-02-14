// app/api/productos/stats/route.js
// Endpoint optimizado para el Dashboard - NO trae todos los productos

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalProductos, productosStockBajoRaw] = await Promise.all([
      prisma.producto.count(),

      // SQL directo para comparar stock <= stockMinimo (Prisma no soporta campo vs campo)
      prisma.$queryRaw`
        SELECT 
          p.id, 
          p.nombre, 
          p.stock, 
          p."stockMinimo",
          c.nombre as "categoriaNombre"
        FROM "Producto" p
        JOIN "Categoria" c ON p."categoriaId" = c.id
        WHERE p.stock <= p."stockMinimo"
        ORDER BY p.stock ASC
      `,
    ]);

    // Normalizar formato para que coincida con lo que espera el Dashboard
    const productosStockBajo = productosStockBajoRaw.map(p => ({
      id: Number(p.id),
      nombre: p.nombre,
      stock: Number(p.stock),
      stockMinimo: Number(p.stockMinimo),
      categoria: { nombre: p.categoriaNombre }
    }));

    return NextResponse.json({
      totalProductos,
      productosStockBajo,
    });
  } catch (error) {
    console.error('Error en stats de productos:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}