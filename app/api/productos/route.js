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
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo producto
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, precio, stock, stockMinimo, categoriaId, proveedorId } = body;

    if (!nombre || !precio || categoriaId === undefined || proveedorId === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, precio, categoriaId, proveedorId' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.create({
      data: {
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: stock ? parseInt(stock) : 0,
        stockMinimo: stockMinimo ? parseInt(stockMinimo) : 5,
        categoriaId: parseInt(categoriaId),
        proveedorId: parseInt(proveedorId),
      },
      include: {
        categoria: true,
        proveedor: true,
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}