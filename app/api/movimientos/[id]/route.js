// app/api/movimientos/[id]/route.js
// Cancelar un movimiento (solo ADMINISTRADOR) y reintegrar stock

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

// PATCH /api/movimientos/[id] — cancelar movimiento
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
    // Si fue ENTRADA (+cantidad) → restar; si fue SALIDA (-cantidad) → sumar
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
          cancelado:         true,
          motivoCancelacion,
          canceladoAt:       new Date(),
        },
        include: {
          producto: { include: { categoria: true } },
          usuario:  { select: { id: true, nombre: true, email: true } },
        },
      }),
      prisma.producto.update({
        where: { id: movimiento.productoId },
        data:  { stock: nuevoStock },
      }),
    ]);

    return NextResponse.json(movimientoActualizado);
  } catch (error) {
    console.error('Error al cancelar movimiento:', error);
    return NextResponse.json({ error: 'Error al cancelar movimiento' }, { status: 500 });
  }
}