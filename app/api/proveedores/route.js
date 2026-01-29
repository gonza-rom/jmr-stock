import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los proveedores
export async function GET() {
  try {
    const proveedores = await prisma.proveedor.findMany({
      include: {
        _count: {
          select: { productos: true }
        }
      },
      orderBy: {
        nombre: 'asc',
      },
    });
    return NextResponse.json(proveedores);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener proveedores' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo proveedor
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, telefono, email, direccion } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const proveedor = await prisma.proveedor.create({
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

    return NextResponse.json(proveedor, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un proveedor con ese email' },
        { status: 409 }
      );
    }
    console.error('Error al crear proveedor:', error);
    return NextResponse.json(
      { error: 'Error al crear proveedor' },
      { status: 500 }
    );
  }
}