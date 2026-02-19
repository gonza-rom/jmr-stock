// app/api/movimientos/[id]/route.js
// Cancelar y editar movimientos (solo ADMINISTRADOR)

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
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ✅ PUT - Editar movimiento
export async function PUT(request, context) {
  try {
    const user = await getUserFromToken();

    // Solo administrador puede editar
    if (!user || user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'Solo un administrador puede editar movimientos' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const body = await request.json();
    const { cantidad, motivo, fecha, usuarioId } = body;

    // Obtener el movimiento original
    const movimientoOriginal = await prisma.movimiento.findUnique({
      where: { id },
      include: { producto: true }
    });

    if (!movimientoOriginal) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (movimientoOriginal.cancelado) {
      return NextResponse.json({ error: 'No se puede editar un movimiento cancelado' }, { status: 400 });
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
        where: { id },
        data: {
          cantidad: cantidadNueva,
          motivo: motivo !== undefined ? motivo : movimientoOriginal.motivo,
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
    return NextResponse.json({ error: 'Error al editar movimiento' }, { status: 500 });
  }
}

// PATCH - Cancelar movimiento
export async function PATCH(request, context) {
  try {
    const user = await getUserFromToken();

    // Solo administrador puede cancelar
    if (!user || user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { error: 'Solo un administrador puede cancelar movimientos' },
        { status: 403 }
      );
    }

    const params = await context.params;
    const id = parseInt(params.id);
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 });

    const body = await request.json();
    const motivoCancelacion = body.motivoCancelacion?.trim() || 'Cancelado por administrador';

    // Obtener el movimiento
    const movimiento = await prisma.movimiento.findUnique({
      where: { id },
      include: { producto: true },
    });

    if (!movimiento) {
      return NextResponse.json({ error: 'Movimiento no encontrado' }, { status: 404 });
    }

    if (movimiento.cancelado) {
      return NextResponse.json({ error: 'El movimiento ya fue cancelado' }, { status: 409 });
    }

    // Calcular nuevo stock: invertir la operación original
    const delta = movimiento.tipo === 'ENTRADA' ? -movimiento.cantidad : movimiento.cantidad;
    const nuevoStock = movimiento.producto.stock + delta;

    if (nuevoStock < 0) {
      return NextResponse.json(
        { error: `No se puede cancelar: el stock quedaría en ${nuevoStock} (negativo)` },
        { status: 400 }
      );
    }

    // Transacción: marcar cancelado + reintegrar stock
    const [movimientoActualizado] = await prisma.$transaction([
      prisma.movimiento.update({
        where: { id },
        data: {
          cancelado: true,
          motivoCancelacion,
          canceladoAt: new Date(),
        },
        include: {
          producto: { include: { categoria: true } },
          usuario: { select: { id: true, nombre: true, email: true } },
        },
      }),
      prisma.producto.update({
        where: { id: movimiento.productoId },
        data: { stock: nuevoStock },
      }),
    ]);

    return NextResponse.json(movimientoActualizado);
  } catch (error) {
    console.error('Error al cancelar movimiento:', error);
    return NextResponse.json({ error: 'Error al cancelar movimiento' }, { status: 500 });
  }
}