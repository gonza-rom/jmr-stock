import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [totalProductos, totalCategorias, totalProveedores, productosStockBajoRaw, movimientosRecientes] =
      await Promise.all([
        prisma.producto.count(),
        prisma.categoria.count(),
        prisma.proveedor.count(),

        // Stock bajo: SQL directo para comparar campo vs campo
        prisma.$queryRaw`
          SELECT
            p.id,
            p.nombre,
            p.stock,
            p."stockMinimo",
            c.nombre AS "categoriaNombre"
          FROM "Producto" p
          JOIN "Categoria" c ON p."categoriaId" = c.id
          WHERE p.stock <= p."stockMinimo"
          ORDER BY p.stock ASC
        `,

        // Últimos 5 movimientos activos — solo los campos que usa el dashboard
        prisma.movimiento.findMany({
          where: { cancelado: false },
          select: {
            id:        true,
            tipo:      true,
            cantidad:  true,
            motivo:    true,
            createdAt: true,
            producto: {
              select: { id: true, nombre: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

    const productosStockBajo = productosStockBajoRaw.map((p) => ({
      id:          Number(p.id),
      nombre:      p.nombre,
      stock:       Number(p.stock),
      stockMinimo: Number(p.stockMinimo),
      categoria:   { nombre: p.categoriaNombre },
    }));

    return NextResponse.json({
      totalProductos,
      totalCategorias,
      totalProveedores,
      productosStockBajo,
      movimientosRecientes,
    });
  } catch (error) {
    console.error('Error en dashboard:', error);
    return NextResponse.json({ error: 'Error al obtener datos del dashboard' }, { status: 500 });
  }
}