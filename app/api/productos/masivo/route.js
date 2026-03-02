import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST - Actualización masiva de productos
export async function POST(request) {
  try {
    const body = await request.json();
    const { productosIds, accion, datos } = body;

    if (!productosIds || productosIds.length === 0) {
      return NextResponse.json(
        { error: 'Debes seleccionar al menos un producto' },
        { status: 400 }
      );
    }

    if (!accion) {
      return NextResponse.json(
        { error: 'Debes especificar una acción' },
        { status: 400 }
      );
    }

    switch (accion) {
      // ── Cambio de categoría: 1 updateMany + 1 findMany ──
      case 'CAMBIAR_CATEGORIA': {
        if (!datos.categoriaId) {
          return NextResponse.json({ error: 'Debes especificar una categoría' }, { status: 400 });
        }

        const [, resultados] = await prisma.$transaction([
          prisma.producto.updateMany({
            where: { id: { in: productosIds } },
            data: { categoriaId: parseInt(datos.categoriaId) },
          }),
          prisma.producto.findMany({
            where: { id: { in: productosIds } },
            include: { categoria: true, proveedor: true },
          }),
        ]);

        return NextResponse.json({
          success: true,
          message: `Se actualizaron ${productosIds.length} productos correctamente`,
          productos: resultados,
        });
      }

      // ── Cambio de proveedor: 1 updateMany + 1 findMany ──
      case 'CAMBIAR_PROVEEDOR': {
        if (!datos.proveedorId) {
          return NextResponse.json({ error: 'Debes especificar un proveedor' }, { status: 400 });
        }

        const [, resultados] = await prisma.$transaction([
          prisma.producto.updateMany({
            where: { id: { in: productosIds } },
            data: { proveedorId: parseInt(datos.proveedorId) },
          }),
          prisma.producto.findMany({
            where: { id: { in: productosIds } },
            include: { categoria: true, proveedor: true },
          }),
        ]);

        return NextResponse.json({
          success: true,
          message: `Se actualizaron ${productosIds.length} productos correctamente`,
          productos: resultados,
        });
      }

      // ── Ajuste de stock: 1 findMany + N updates en paralelo + N creates en paralelo ──
      case 'AJUSTAR_STOCK': {
        if (!datos.tipo || !datos.cantidad) {
          return NextResponse.json({ error: 'Debes especificar tipo y cantidad' }, { status: 400 });
        }

        const cantidad = parseInt(datos.cantidad);
        const tipo = datos.tipo; // 'SUMAR' | 'RESTAR' | 'ESTABLECER'
        const motivo = datos.motivo || 'Ajuste masivo de stock';

        // 1. Traer todos los productos de una sola vez
        const productos = await prisma.producto.findMany({
          where: { id: { in: productosIds } },
          select: { id: true, stock: true },
        });

        // 2. Calcular el nuevo stock para cada uno
        const updates = productos.map((p) => {
          let nuevoStock = p.stock;
          if (tipo === 'SUMAR')      nuevoStock = p.stock + cantidad;
          else if (tipo === 'RESTAR') nuevoStock = Math.max(0, p.stock - cantidad);
          else if (tipo === 'ESTABLECER') nuevoStock = cantidad;

          const delta = Math.abs(nuevoStock - p.stock);
          const tipoMov = nuevoStock >= p.stock ? 'ENTRADA' : 'SALIDA';

          return { id: p.id, nuevoStock, delta, tipoMov };
        });

        // 3. Ejecutar todos los updates y creates en una transacción única
        await prisma.$transaction([
          // N updates de producto (en paralelo dentro de la tx)
          ...updates.map(({ id, nuevoStock }) =>
            prisma.producto.update({ where: { id }, data: { stock: nuevoStock } })
          ),
          // N creates de movimiento (solo si el stock cambió)
          ...updates
            .filter(({ delta }) => delta > 0)
            .map(({ id, delta, tipoMov }) =>
              prisma.movimiento.create({
                data: {
                  productoId: id,
                  tipo: tipoMov,
                  cantidad: delta,
                  motivo,
                  createdAt: new Date(),
                },
              })
            ),
        ]);

        // 4. Traer resultados finales
        const resultados = await prisma.producto.findMany({
          where: { id: { in: productosIds } },
          include: { categoria: true, proveedor: true },
        });

        return NextResponse.json({
          success: true,
          message: `Se actualizaron ${productosIds.length} productos correctamente`,
          productos: resultados,
        });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en actualización masiva:', error);
    return NextResponse.json({ error: 'Error al actualizar productos' }, { status: 500 });
  }
}