import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todas las categorías
export async function GET() {
  try {
    const categorias = await prisma.categoria.findMany({
      include: {
        _count: {
          select: { productos: true }
        }
      },
      orderBy: {
        nombre: 'asc',
      },
    });
    return NextResponse.json(categorias);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva categoría
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    const categoria = await prisma.categoria.create({
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

    return NextResponse.json(categoria, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre' },
        { status: 409 }
      );
    }
    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { error: 'Error al crear categoría' },
      { status: 500 }
    );
  }
}