import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambialo-en-produccion';

// Función para obtener usuario del token
async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) return null;
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// GET - Obtener todos los movimientos
export async function GET() {
  try {
    const movimientos = await prisma.movimiento.findMany({
      include: {
        producto: {
          include: {
            categoria: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener movimientos' },
      { status: 500 }
    );
  }
}

// POST - Registrar nuevo movimiento
export async function POST(request) {
  try {
    const body = await request.json();
    const { productoId, tipo, cantidad, motivo } = body;

    if (!productoId || !tipo || !cantidad) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: productoId, tipo, cantidad' },
        { status: 400 }
      );
    }

    if (!['ENTRADA', 'SALIDA'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo debe ser ENTRADA o SALIDA' },
        { status: 400 }
      );
    }

    const cantidadNum = parseInt(cantidad);
    if (cantidadNum <= 0) {
      return NextResponse.json(
        { error: 'La cantidad debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Obtener usuario autenticado
    const user = await getUserFromToken();

    // Obtener el producto actual
    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(productoId) }
    });

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Calcular nuevo stock
    let nuevoStock = producto.stock;
    if (tipo === 'ENTRADA') {
      nuevoStock += cantidadNum;
    } else {
      nuevoStock -= cantidadNum;
      if (nuevoStock < 0) {
        return NextResponse.json(
          { error: 'Stock insuficiente para realizar la salida' },
          { status: 400 }
        );
      }
    }

    // Crear movimiento y actualizar stock en una transacción
    const resultado = await prisma.$transaction([
      prisma.movimiento.create({
        data: {
          productoId: parseInt(productoId),
          tipo,
          cantidad: cantidadNum,
          motivo,
          usuarioId: user?.id || null,
        },
        include: {
          producto: {
            include: {
              categoria: true
            }
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        }
      }),
      prisma.producto.update({
        where: { id: parseInt(productoId) },
        data: { stock: nuevoStock }
      })
    ]);

    return NextResponse.json(resultado[0], { status: 201 });
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    return NextResponse.json(
      { error: 'Error al registrar movimiento' },
      { status: 500 }
    );
  }
}