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

    let resultados = [];

    switch (accion) {
      case 'CAMBIAR_CATEGORIA':
        if (!datos.categoriaId) {
          return NextResponse.json(
            { error: 'Debes especificar una categoría' },
            { status: 400 }
          );
        }
        
        await prisma.producto.updateMany({
          where: { id: { in: productosIds } },
          data: { categoriaId: parseInt(datos.categoriaId) }
        });
        
        resultados = await prisma.producto.findMany({
          where: { id: { in: productosIds } },
          include: { categoria: true, proveedor: true }
        });
        break;

      case 'CAMBIAR_PROVEEDOR':
        if (!datos.proveedorId) {
          return NextResponse.json(
            { error: 'Debes especificar un proveedor' },
            { status: 400 }
          );
        }
        
        await prisma.producto.updateMany({
          where: { id: { in: productosIds } },
          data: { proveedorId: parseInt(datos.proveedorId) }
        });
        
        resultados = await prisma.producto.findMany({
          where: { id: { in: productosIds } },
          include: { categoria: true, proveedor: true }
        });
        break;

      case 'AJUSTAR_STOCK':
        if (!datos.tipo || !datos.cantidad) {
          return NextResponse.json(
            { error: 'Debes especificar tipo y cantidad' },
            { status: 400 }
          );
        }

        const cantidad = parseInt(datos.cantidad);
        
        for (const productoId of productosIds) {
          const producto = await prisma.producto.findUnique({
            where: { id: productoId }
          });

          if (!producto) continue;

          let nuevoStock = producto.stock;
          
          if (datos.tipo === 'SUMAR') {
            nuevoStock += cantidad;
          } else if (datos.tipo === 'RESTAR') {
            nuevoStock -= cantidad;
            if (nuevoStock < 0) nuevoStock = 0;
          } else if (datos.tipo === 'ESTABLECER') {
            nuevoStock = cantidad;
          }

          await prisma.producto.update({
            where: { id: productoId },
            data: { stock: nuevoStock }
          });

          // Crear movimiento
          await prisma.movimiento.create({
            data: {
              productoId,
              tipo: datos.tipo === 'RESTAR' ? 'SALIDA' : 'ENTRADA',
              cantidad: Math.abs(producto.stock - nuevoStock),
              motivo: datos.motivo || 'Ajuste masivo de stock'
            }
          });
        }

        resultados = await prisma.producto.findMany({
          where: { id: { in: productosIds } },
          include: { categoria: true, proveedor: true }
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Se actualizaron ${productosIds.length} productos correctamente`,
      productos: resultados
    });

  } catch (error) {
    console.error('Error en actualización masiva:', error);
    return NextResponse.json(
      { error: 'Error al actualizar productos' },
      { status: 500 }
    );
  }
}