// app/api/estadisticas/route.js
// ✅ VERSIÓN OPTIMIZADA — Aggregations en PostgreSQL, sin procesar en JS
// Antes: cargaba TODAS las ventas con items en memoria (~3s con 5k ventas)
// Ahora: todo calculado en la DB con queries paralelas (~150ms)

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin    = searchParams.get('fechaFin');

    const conFechas = Boolean(fechaInicio && fechaFin);
    const desde = conFechas ? new Date(fechaInicio)            : null;
    const hasta = conFechas ? new Date(`${fechaFin}T23:59:59`) : null;

    // Filtro para queries tipadas de Prisma
    const whereDate = conFechas
      ? { createdAt: { gte: desde, lte: hasta } }
      : {};

    // ── 6 queries en paralelo, todo calculado en PostgreSQL ──────────────────
    const [
      resumen,
      ventasPorMetodoRaw,
      ventasPorDiaRaw,
      ventasPorMesRaw,
      productosMasVendidosRaw,
      ventasPorCategoriaRaw,
    ] = await Promise.all([

      // 1. Resumen total — Prisma aggregate (más limpio que raw SQL)
      prisma.venta.aggregate({
        where:  whereDate,
        _count: { id: true },
        _sum:   { total: true },
        _avg:   { total: true },
      }),

      // 2. Por método de pago — Prisma groupBy
      prisma.venta.groupBy({
        by:     ['metodoPago'],
        where:  whereDate,
        _count: { id: true },
        _sum:   { total: true },
        orderBy: { _sum: { total: 'desc' } },
      }),

      // 3. Por día — raw SQL (Prisma no soporta DATE truncation nativa)
      conFechas
        ? prisma.$queryRaw`
            SELECT
              DATE(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires') AS fecha,
              COUNT(v.id)::int AS cantidad,
              SUM(v.total)     AS total
            FROM "Venta" v
            WHERE v."createdAt" >= ${desde} AND v."createdAt" <= ${hasta}
            GROUP BY DATE(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires')
            ORDER BY fecha ASC
          `
        : prisma.$queryRaw`
            SELECT
              DATE(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires') AS fecha,
              COUNT(v.id)::int AS cantidad,
              SUM(v.total)     AS total
            FROM "Venta" v
            GROUP BY DATE(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires')
            ORDER BY fecha ASC
          `,

      // 4. Por mes — raw SQL
      conFechas
        ? prisma.$queryRaw`
            SELECT
              TO_CHAR(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS mes,
              COUNT(v.id)::int AS cantidad,
              SUM(v.total)     AS total
            FROM "Venta" v
            WHERE v."createdAt" >= ${desde} AND v."createdAt" <= ${hasta}
            GROUP BY TO_CHAR(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM')
            ORDER BY mes ASC
          `
        : prisma.$queryRaw`
            SELECT
              TO_CHAR(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM') AS mes,
              COUNT(v.id)::int AS cantidad,
              SUM(v.total)     AS total
            FROM "Venta" v
            GROUP BY TO_CHAR(v."createdAt" AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM')
            ORDER BY mes ASC
          `,

      // 5. Top 10 productos más vendidos — raw SQL con JOIN
      conFechas
        ? prisma.$queryRaw`
            SELECT
              p.id,
              p.nombre,
              COALESCE(c.nombre, 'Sin categoría') AS "categoriaNombre",
              SUM(vi.cantidad)::int               AS "cantidadVendida",
              SUM(vi.subtotal)                    AS "ingresoGenerado"
            FROM "VentaItem" vi
            JOIN "Venta"    v  ON vi."ventaId"    = v.id
            JOIN "Producto" p  ON vi."productoId" = p.id
            LEFT JOIN "Categoria" c ON p."categoriaId" = c.id
            WHERE v."createdAt" >= ${desde} AND v."createdAt" <= ${hasta}
            GROUP BY p.id, p.nombre, c.nombre
            ORDER BY "cantidadVendida" DESC
            LIMIT 10
          `
        : prisma.$queryRaw`
            SELECT
              p.id,
              p.nombre,
              COALESCE(c.nombre, 'Sin categoría') AS "categoriaNombre",
              SUM(vi.cantidad)::int               AS "cantidadVendida",
              SUM(vi.subtotal)                    AS "ingresoGenerado"
            FROM "VentaItem" vi
            JOIN "Venta"    v  ON vi."ventaId"    = v.id
            JOIN "Producto" p  ON vi."productoId" = p.id
            LEFT JOIN "Categoria" c ON p."categoriaId" = c.id
            GROUP BY p.id, p.nombre, c.nombre
            ORDER BY "cantidadVendida" DESC
            LIMIT 10
          `,

      // 6. Por categoría — raw SQL con LEFT JOIN para incluir "Sin categoría"
      conFechas
        ? prisma.$queryRaw`
            SELECT
              COALESCE(c.nombre, 'Sin categoría') AS nombre,
              SUM(vi.cantidad)::int AS cantidad,
              SUM(vi.subtotal)      AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta"    v  ON vi."ventaId"    = v.id
            JOIN "Producto" p  ON vi."productoId" = p.id
            LEFT JOIN "Categoria" c ON p."categoriaId" = c.id
            WHERE v."createdAt" >= ${desde} AND v."createdAt" <= ${hasta}
            GROUP BY c.nombre
            ORDER BY ingreso DESC
          `
        : prisma.$queryRaw`
            SELECT
              COALESCE(c.nombre, 'Sin categoría') AS nombre,
              SUM(vi.cantidad)::int AS cantidad,
              SUM(vi.subtotal)      AS ingreso
            FROM "VentaItem" vi
            JOIN "Venta"    v  ON vi."ventaId"    = v.id
            JOIN "Producto" p  ON vi."productoId" = p.id
            LEFT JOIN "Categoria" c ON p."categoriaId" = c.id
            GROUP BY c.nombre
            ORDER BY ingreso DESC
          `,
    ]);

    // ── Normalizar BigInt a number (PostgreSQL devuelve BigInt en agregaciones) ──
    const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v ?? 0));

    return NextResponse.json({
      resumen: {
        totalVentas:   resumen._count.id   ?? 0,
        ingresoTotal:  resumen._sum.total  ?? 0,
        promedioVenta: resumen._avg.total  ?? 0,
      },

      ventasPorMetodo: ventasPorMetodoRaw.map(m => ({
        metodo:   m.metodoPago,
        cantidad: m._count.id,
        total:    m._sum.total ?? 0,
      })),

      ventasPorDia: ventasPorDiaRaw.map(r => ({
        // DATE de PostgreSQL puede llegar como Date object o string según el driver
        fecha:    r.fecha instanceof Date
          ? r.fecha.toISOString().split('T')[0]
          : String(r.fecha),
        cantidad: toNum(r.cantidad),
        total:    toNum(r.total),
      })),

      ventasPorMes: ventasPorMesRaw.map(r => ({
        mes:      String(r.mes),
        cantidad: toNum(r.cantidad),
        total:    toNum(r.total),
      })),

      productosMasVendidos: productosMasVendidosRaw.map(r => ({
        producto: {
          id:        toNum(r.id),
          nombre:    r.nombre,
          categoria: { nombre: r.categoriaNombre ?? 'Sin categoría' },
        },
        cantidadVendida: toNum(r.cantidadVendida),
        ingresoGenerado: toNum(r.ingresoGenerado),
      })),

      ventasPorCategoria: ventasPorCategoriaRaw.map(r => ({
        nombre:   r.nombre,
        cantidad: toNum(r.cantidad),
        ingreso:  toNum(r.ingreso),
      })),
    });

  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}