import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener proveedor por ID
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

    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    if (!proveedor) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(proveedor);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener proveedor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar proveedor por ID
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
    const { nombre, telefono, email, direccion } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.update({
      where: { id },
      data: {
        nombre,
        telefono,
        email,
        direccion,
      },
      include: {
        _count: {
          select: { productos: true }
        }
      }
    });

    return NextResponse.json(proveedor);
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un proveedor con ese email' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error al actualizar proveedor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar proveedor por ID
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

    // Primero eliminar todos los movimientos de productos de este proveedor
    const productos = await prisma.producto.findMany({
      where: { proveedorId: id },
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
        where: { proveedorId: id }
      });
    }

    // Finalmente eliminar el proveedor
    await prisma.proveedor.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Proveedor eliminado correctamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Error al eliminar proveedor' },
      { status: 500 }
    );
  }
}