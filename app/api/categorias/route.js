import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener categoría por ID
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

    const categoria = await prisma.categoria.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    if (!categoria) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(categoria);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener categoría' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar categoría por ID
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
    const { nombre, descripcion } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const categoria = await prisma.categoria.update({
      where: { id },
      data: {
        nombre,
        descripcion,
      },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    return NextResponse.json(categoria);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar categoría' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar categoría por ID
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

    // Primero eliminar todos los movimientos de productos de esta categoría
    const productos = await prisma.producto.findMany({
      where: { categoriaId: id },
      select: { id: true }
    });

    const productosIds = productos.map(p => p.id);

    if (productosIds.length > 0) {
      await prisma.movimiento.deleteMany({
        where: {
          productoId: {
            in: productosIds
          }
        }
      });

      // Luego eliminar los productos
      await prisma.producto.deleteMany({
        where: { categoriaId: id }
      });
    }

    // Finalmente eliminar la categoría
    await prisma.categoria.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Categoría eliminada correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Error al eliminar categoría' },
      { status: 500 }
    );
  }
}