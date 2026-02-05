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

// GET - Obtener todas las ventas con filtros
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where = {};
    
    if (fechaInicio && fechaFin) {
      where.createdAt = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin + 'T23:59:59')
      };
    }

    const ventas = await prisma.venta.findMany({
      where,
      include: {
        items: {
          include: {
            producto: {
              include: {
                categoria: true
              }
            }
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
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json(
      { error: 'Error al obtener ventas' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva venta
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, metodoPago, clienteNombre, clienteDni, observaciones } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'La venta debe tener al menos un producto' },
        { status: 400 }
      );
    }

    if (!metodoPago) {
      return NextResponse.json(
        { error: 'El método de pago es requerido' },
        { status: 400 }
      );
    }

    // Validar método de pago
    const metodosValidos = ['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'QR'];
    if (!metodosValidos.includes(metodoPago)) {
      return NextResponse.json(
        { error: 'Método de pago no válido' },
        { status: 400 }
      );
    }

    // Obtener usuario autenticado
    const user = await getUserFromToken();

    // Validar stock de todos los productos
    for (const item of items) {
      const producto = await prisma.producto.findUnique({
        where: { id: item.productoId }
      });

      if (!producto) {
        return NextResponse.json(
          { error: `Producto con ID ${item.productoId} no encontrado` },
          { status: 404 }
        );
      }

      if (producto.stock < item.cantidad) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}` },
          { status: 400 }
        );
      }
    }

    // Calcular total
    const total = items.reduce((sum, item) => sum + (item.precioUnit * item.cantidad), 0);

    // Crear venta con items y actualizar stock en una transacción
    const venta = await prisma.$transaction(async (tx) => {
      // Crear la venta
      const nuevaVenta = await tx.venta.create({
        data: {
          total,
          metodoPago,
          clienteNombre,
          clienteDni,
          observaciones,
          usuarioId: user?.id || null,
          items: {
            create: items.map(item => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnit: item.precioUnit,
              subtotal: item.precioUnit * item.cantidad
            }))
          }
        },
        include: {
          items: {
            include: {
              producto: true
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
      });

      // Actualizar stock de cada producto y crear movimiento
      for (const item of items) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: {
            stock: {
              decrement: item.cantidad
            }
          }
        });

        // Crear movimiento de salida por venta
        await tx.movimiento.create({
          data: {
            productoId: item.productoId,
            tipo: 'SALIDA',
            cantidad: item.cantidad,
            motivo: `Venta #${nuevaVenta.id}`,
            usuarioId: user?.id || null,
          }
        });
      }

      return nuevaVenta;
    });

    return NextResponse.json(venta, { status: 201 });
  } catch (error) {
    console.error('Error al crear venta:', error);
    return NextResponse.json(
      { error: 'Error al procesar la venta' },
      { status: 500 }
    );
  }
}