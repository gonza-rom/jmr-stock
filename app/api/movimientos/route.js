import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambialo-en-produccion';

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

// Construye una fecha combinando fecha (YYYY-MM-DD) + hora opcional (HH:mm)
// Si no hay hora manual, usa la hora actual del servidor
function buildFecha(fecha, hora) {
  if (!fecha) return new Date();
  const [y, m, d] = fecha.split('-').map(Number);
  if (hora) {
    const [hh, mm] = hora.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, 0);
  }
  // Sin hora manual → hora actual del servidor
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
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
        },
        // ✅ Incluir la venta relacionada para mostrar el precio
        venta: {
          select: {
            id: true,
            total: true,
            metodoPago: true
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

// POST - Registrar nuevo movimiento
export async function POST(request) {
  try {
    const body = await request.json();
    const { productoId, tipo, cantidad, motivo, fecha, hora, metodoPago, usuarioIdSeleccionado } = body;

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

    const user = await getUserFromToken();
    const usuarioFinal = usuarioIdSeleccionado ? parseInt(usuarioIdSeleccionado) : (user?.id || null);

    const producto = await prisma.producto.findUnique({
      where: { id: parseInt(productoId) }
    });

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    let nuevoStock = producto.stock;
    if (tipo === 'ENTRADA') {
      nuevoStock += cantidadNum;
    } else {
      nuevoStock -= cantidadNum;
      if (nuevoStock < 0) {
        return NextResponse.json(
          { error: 'Stock insuficiente para realizar la operación' },
          { status: 400 }
        );
      }
    }

    // ✅ Usar hora real o manual
    const fechaCreacion = buildFecha(fecha, hora);

    const resultado = await prisma.$transaction(async (tx) => {
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

      const movimiento = await tx.movimiento.create({
        data: {
          productoId: parseInt(productoId),
          tipo,
          cantidad: cantidadNum,
          motivo: tipo === 'VENTA' ? (motivo || `Venta #${ventaId}`) : motivo,
          ventaId: ventaId,
          usuarioId: usuarioFinal,
          createdAt: fechaCreacion,
        },
        include: {
          producto: { include: { categoria: true } },
          usuario: { select: { id: true, nombre: true, email: true } },
          venta: { select: { id: true, total: true, metodoPago: true } }
        }
      });

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

// PUT - Editar movimiento existente (solo admin)
export async function PUT(request) {
  try {
    const user = await getUserFromToken();

    if (!user || user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'Solo un administrador puede editar movimientos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, cantidad, motivo, fecha, hora, usuarioId } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID del movimiento es requerido' }, { status: 400 });
    }

    const movimientoOriginal = await prisma.movimiento.findUnique({
      where: { id: parseInt(id) },
      include: { producto: true }
    });

    if (!movimientoOriginal) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (movimientoOriginal.cancelado) {
      return NextResponse.json(
        { error: 'No se puede editar un movimiento cancelado' },
        { status: 400 }
      );
    }

    const cantidadNueva = parseInt(cantidad);
    const cantidadOriginal = movimientoOriginal.cantidad;
    const diferencia = cantidadNueva - cantidadOriginal;

    let nuevoStock = movimientoOriginal.producto.stock;
    if (diferencia !== 0) {
      if (movimientoOriginal.tipo === 'ENTRADA') {
        nuevoStock += diferencia;
      } else {
        nuevoStock -= diferencia;
      }
      if (nuevoStock < 0) {
        return NextResponse.json(
          { error: `Stock insuficiente. El stock quedaría en ${nuevoStock}` },
          { status: 400 }
        );
      }
    }

    // ✅ Usar hora real o manual también en edición
    const fechaActualizada = fecha
      ? buildFecha(fecha, hora)
      : movimientoOriginal.createdAt;

    const movimientoActualizado = await prisma.$transaction(async (tx) => {
      const movActualizado = await tx.movimiento.update({
        where: { id: parseInt(id) },
        data: {
          cantidad: cantidadNueva,
          motivo: motivo || movimientoOriginal.motivo,
          createdAt: fechaActualizada,
          usuarioId: usuarioId ? parseInt(usuarioId) : movimientoOriginal.usuarioId,
        },
        include: {
          producto: { include: { categoria: true } },
          usuario: { select: { id: true, nombre: true, email: true } },
          venta: { select: { id: true, total: true, metodoPago: true } }
        }
      });

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