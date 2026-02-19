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
      take: 200,
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al obtener movimientos' },
      { status: 500 }
    );
  }
}

// POST - Registrar nuevo movimiento (incluyendo ventas)
export async function POST(request) {
  try {
    const body = await request.json();
    const { productoId, tipo, cantidad, motivo, fecha, metodoPago, usuarioIdSeleccionado } = body;

    if (!productoId || !tipo || !cantidad) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: productoId, tipo, cantidad' },
        { status: 400 }
      );
    }

    if (!['ENTRADA', 'SALIDA', 'VENTA'].includes(tipo)) {
      return NextResponse.json(
        { error: 'Tipo debe ser ENTRADA, SALIDA o VENTA' },
        { status: 400 }
      );
    }

    // Validar método de pago si es VENTA
    if (tipo === 'VENTA' && !metodoPago) {
      return NextResponse.json(
        { error: 'El método de pago es requerido para ventas' },
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

    // ✅ NUEVO: Determinar qué usuario usar
    // Si se especificó usuarioIdSeleccionado, usar ese; sino usar el del token
    const usuarioFinal = usuarioIdSeleccionado ? parseInt(usuarioIdSeleccionado) : (user?.id || null);

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
    } else { // SALIDA o VENTA
      nuevoStock -= cantidadNum;
      if (nuevoStock < 0) {
        return NextResponse.json(
          { error: 'Stock insuficiente para realizar la operación' },
          { status: 400 }
        );
      }
    }

    // Preparar fecha
    let fechaCreacion = new Date();
    if (fecha) {
      const fechaParts = fecha.split('-');
      fechaCreacion = new Date(parseInt(fechaParts[0]), parseInt(fechaParts[1]) - 1, parseInt(fechaParts[2]), 12, 0, 0);
    }

    // Crear movimiento y actualizar stock en una transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Si es VENTA, crear también el registro de venta
      let ventaId = null;
      if (tipo === 'VENTA') {
        const venta = await tx.venta.create({
          data: {
            total: producto.precio * cantidadNum,
            metodoPago,
            clienteNombre: motivo || null,
            usuarioId: usuarioFinal,
            createdAt: fechaCreacion,
            items: {
              create: {
                productoId: parseInt(productoId),
                cantidad: cantidadNum,
                precioUnit: producto.precio,
                subtotal: producto.precio * cantidadNum
              }
            }
          }
        });
        ventaId = venta.id;
      }

      // Crear movimiento
      const movimiento = await tx.movimiento.create({
        data: {
          productoId: parseInt(productoId),
          tipo,
          cantidad: cantidadNum,
          motivo: tipo === 'VENTA' ? (motivo || `Venta #${ventaId}`) : motivo,
          metodoPago: tipo === 'VENTA' ? metodoPago : null, // ✅ Guardar método de pago
          usuarioId: usuarioFinal,
          createdAt: fechaCreacion,
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
      });

      // Actualizar stock
      await tx.producto.update({
        where: { id: parseInt(productoId) },
        data: { stock: nuevoStock }
      });

      return movimiento;
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    return NextResponse.json(
      { error: 'Error al registrar movimiento' },
      { status: 500 }
    );
  }
}

// ✅ NUEVO: PUT - Editar movimiento existente
export async function PUT(request) {
  try {
    const user = await getUserFromToken();

    // Solo administrador puede editar
    if (!user || user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'Solo un administrador puede editar movimientos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, cantidad, motivo, fecha, usuarioId } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del movimiento es requerido' },
        { status: 400 }
      );
    }

    // Obtener el movimiento original
    const movimientoOriginal = await prisma.movimiento.findUnique({
      where: { id: parseInt(id) },
      include: { producto: true }
    });

    if (!movimientoOriginal) {
      return NextResponse.json(
        { error: 'Movimiento no encontrado' },
        { status: 404 }
      );
    }

    if (movimientoOriginal.cancelado) {
      return NextResponse.json(
        { error: 'No se puede editar un movimiento cancelado' },
        { status: 400 }
      );
    }

    // Si la cantidad cambió, necesitamos ajustar el stock
    const cantidadNueva = parseInt(cantidad);
    const cantidadOriginal = movimientoOriginal.cantidad;
    const diferencia = cantidadNueva - cantidadOriginal;

    let nuevoStock = movimientoOriginal.producto.stock;

    if (diferencia !== 0) {
      // Ajustar stock según el tipo de movimiento
      if (movimientoOriginal.tipo === 'ENTRADA') {
        nuevoStock += diferencia; // Si aumenta cantidad, aumenta stock
      } else { // SALIDA o VENTA
        nuevoStock -= diferencia; // Si aumenta cantidad, disminuye stock
      }

      // Validar que el stock no sea negativo
      if (nuevoStock < 0) {
        return NextResponse.json(
          { error: `Stock insuficiente. El stock quedaría en ${nuevoStock}` },
          { status: 400 }
        );
      }
    }

    // Preparar fecha si cambió
    let fechaActualizada = movimientoOriginal.createdAt;
    if (fecha) {
      const fechaParts = fecha.split('-');
      fechaActualizada = new Date(parseInt(fechaParts[0]), parseInt(fechaParts[1]) - 1, parseInt(fechaParts[2]), 12, 0, 0);
    }

    // Actualizar en transacción
    const movimientoActualizado = await prisma.$transaction(async (tx) => {
      // Actualizar el movimiento
      const movActualizado = await tx.movimiento.update({
        where: { id: parseInt(id) },
        data: {
          cantidad: cantidadNueva,
          motivo: motivo || movimientoOriginal.motivo,
          createdAt: fechaActualizada,
          usuarioId: usuarioId ? parseInt(usuarioId) : movimientoOriginal.usuarioId,
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
      });

      // Actualizar stock si cambió la cantidad
      if (diferencia !== 0) {
        await tx.producto.update({
          where: { id: movimientoOriginal.productoId },
          data: { stock: nuevoStock }
        });
      }

      return movActualizado;
    });

    return NextResponse.json(movimientoActualizado);
  } catch (error) {
    console.error('Error al editar movimiento:', error);
    return NextResponse.json(
      { error: 'Error al editar movimiento' },
      { status: 500 }
    );
  }
}