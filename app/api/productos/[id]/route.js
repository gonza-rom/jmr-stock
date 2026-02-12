// app/api/productos/[id]/route.js - VERSIÓN CORREGIDA

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener producto por ID
export async function GET(request, context) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        proveedor: true,
        movimientos: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        precioHistorico: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return NextResponse.json({ error: 'Error al obtener producto' }, { status: 500 });
  }
}

// PUT - Actualizar producto
export async function PUT(request, context) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Obtener producto actual para comparar precio
    const productoActual = await prisma.producto.findUnique({
      where: { id },
      select: { precio: true },
    });

    if (!productoActual) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Construir objeto de datos a actualizar
    const updateData = {};
    if (body.nombre !== undefined) updateData.nombre = body.nombre;
    if (body.descripcion !== undefined) updateData.descripcion = body.descripcion || null;
    if (body.precio !== undefined) updateData.precio = parseFloat(body.precio);
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.stockMinimo !== undefined) updateData.stockMinimo = parseInt(body.stockMinimo);
    if (body.categoriaId !== undefined) updateData.categoriaId = parseInt(body.categoriaId);
    if (body.proveedorId !== undefined) updateData.proveedorId = parseInt(body.proveedorId);
    if (body.codigoBarras !== undefined) updateData.codigoBarras = body.codigoBarras && body.codigoBarras.trim() !== '' ? body.codigoBarras.trim() : null;
    if (body.codigoProducto !== undefined) updateData.codigoProducto = body.codigoProducto && body.codigoProducto.trim() !== '' ? body.codigoProducto.trim() : null;

    // ⭐ LÓGICA CORREGIDA: Manejar imagenes (array) e imagen (principal)
    if (body.imagenes !== undefined) {
      // Actualizar array de imágenes
      updateData.imagenes = Array.isArray(body.imagenes) ? body.imagenes : [];
      
      // Sincronizar imagen principal con la primera del array
      updateData.imagen = body.imagenes[0] || null;
    } else if (body.imagen !== undefined) {
      // Si solo se envía imagen, mantenerla
      updateData.imagen = body.imagen || null;
    }

    // Detectar si el precio cambió
    const precioNuevo = body.precio !== undefined ? parseFloat(body.precio) : null;
    const precioViejo = productoActual.precio;
    const precioCambio = precioNuevo !== null && precioNuevo !== precioViejo;

    // Usar transacción: actualizar producto y crear historial si el precio cambió
    const operaciones = [
      prisma.producto.update({
        where: { id },
        data: updateData,
        include: {
          categoria: true,
          proveedor: true,
        },
      }),
    ];

    if (precioCambio) {
      operaciones.push(
        prisma.precioHistorico.create({
          data: {
            productoId: id,
            precioViejo,
            precioNuevo,
            motivo: body.motivoCambioPrecio || 'Actualización manual',
          },
        })
      );
    }

    const [producto] = await prisma.$transaction(operaciones);

    return NextResponse.json(producto);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'codigoBarras') {
        return NextResponse.json({ error: 'El código de barras ya existe en otro producto' }, { status: 409 });
      } else if (field === 'codigoProducto') {
        return NextResponse.json({ error: 'El código de producto ya existe en otro producto' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Ya existe un producto con ese código' }, { status: 409 });
    }
    console.error('Error al actualizar producto:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE - Eliminar producto y datos relacionados
export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.precioHistorico.deleteMany({ where: { productoId: id } }),
      prisma.movimiento.deleteMany({ where: { productoId: id } }),
      prisma.ventaItem.deleteMany({ where: { productoId: id } }),
      prisma.producto.delete({ where: { id } }),
    ]);

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }
    console.error('Error al eliminar producto:', error);
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}