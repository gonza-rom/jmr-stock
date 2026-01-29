import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener producto por ID
export async function GET(request, context) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        proveedor: true,
        movimientos: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      },
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(producto);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar producto por ID
export async function PUT(request, context) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { nombre, descripcion, precio, stock, stockMinimo, categoriaId, proveedorId } = body;

    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (precio) updateData.precio = parseFloat(precio);
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (stockMinimo !== undefined) updateData.stockMinimo = parseInt(stockMinimo);
    if (categoriaId) updateData.categoriaId = parseInt(categoriaId);
    if (proveedorId) updateData.proveedorId = parseInt(proveedorId);

    const producto = await prisma.producto.update({
      where: { id },
      data: updateData,
      include: {
        categoria: true,
        proveedor: true,
      },
    });

    return NextResponse.json(producto);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar producto por ID
export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }

    // Primero eliminar los movimientos relacionados
    await prisma.movimiento.deleteMany({
      where: { productoId: id }
    });

    // Luego eliminar el producto
    await prisma.producto.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}