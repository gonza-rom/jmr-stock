import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los productos
export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      include: {
        categoria: true,
        proveedor: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST - Crear nuevo producto
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, precio, stock, stockMinimo, imagen, imagenes, categoriaId, proveedorId, codigoBarras, codigoProducto } = body;

    if (!nombre || precio === undefined || precio === '' || !categoriaId || !proveedorId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, precio, categoriaId, proveedorId' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        descripcion: descripcion || null,
        precio: parseFloat(precio),
        stock: stock ? parseInt(stock) : 0,
        stockMinimo: stockMinimo !== undefined && stockMinimo !== '' ? parseInt(stockMinimo) : 5,
        imagen: imagen || null,
        imagenes: imagenes || [],
        categoriaId: parseInt(categoriaId),
        proveedorId: parseInt(proveedorId),
        codigoBarras: codigoBarras && codigoBarras.trim() !== '' ? codigoBarras.trim() : null,
        codigoProducto: codigoProducto && codigoProducto.trim() !== '' ? codigoProducto.trim() : null,
      },
      include: {
        categoria: true,
        proveedor: true,
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0];
      if (field === 'codigoBarras') {
        return NextResponse.json(
          { error: 'El código de barras ya existe en otro producto' },
          { status: 409 }
        );
      } else if (field === 'codigoProducto') {
        return NextResponse.json(
          { error: 'El código de producto ya existe en otro producto' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 409 }
      );
    }
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}