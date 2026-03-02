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

// Construye una fecha combinando fecha (YYYY-MM-DD) + hora opcional (HH:mm)
function buildFecha(fecha, hora) {
  if (!fecha) return new Date();
  const [y, m, d] = fecha.split('-').map(Number);
  if (hora) {
    const [hh, mm] = hora.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, 0);
  }
  const now = new Date();
  return new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds());
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page     = Math.max(1, parseInt(searchParams.get('page')     || '1'));
    const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') || '30'));
    const skip     = (page - 1) * pageSize;

    // Filtros opcionales desde query params (para uso futuro server-side)
    const tipo      = searchParams.get('tipo')      || '';
    const fechaDesde = searchParams.get('fechaDesde') || '';
    const fechaHasta = searchParams.get('fechaHasta') || '';

    const where = {};
    if (tipo)       where.tipo = tipo;
    if (fechaDesde) where.createdAt = { ...(where.createdAt || {}), gte: new Date(fechaDesde) };
    if (fechaHasta) where.createdAt = { ...(where.createdAt || {}), lte: new Date(fechaHasta + 'T23:59:59') };

    // count y datos usan el mismo where → el total es siempre consistente con los filtros
    const [movimientos, total] = await Promise.all([
      prisma.movimiento.findMany({
        where,
        select: {
          id:                true,
          tipo:              true,
          cantidad:          true,
          motivo:            true,
          cancelado:         true,
          motivoCancelacion: true,
          canceladoAt:       true,
          createdAt:         true,
          usuarioId:         true,
          producto: {
            select: {
              id:             true,
              nombre:         true,
              codigoProducto: true,
              precio:         true,
              stock:          true,
              stockMinimo:    true,
              categoria: { select: { id: true, nombre: true } },
            },
          },
          usuario: { select: { id: true, nombre: true, email: true } },
          venta:   { select: { id: true, total: true, metodoPago: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.movimiento.count({ where }), // ← mismo where, siempre consistente
    ]);

    return NextResponse.json({
      movimientos,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 });
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
      where: { id: parseInt(productoId) },
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
                subtotal: producto.precio * cantidadNum,
              },
            },
          },
        });
        ventaId = venta.id;
      }

      const movimiento = await tx.movimiento.create({
        data: {
          productoId: parseInt(productoId),
          tipo,
          cantidad: cantidadNum,
          motivo: tipo === 'VENTA' ? (motivo || `Venta #${ventaId}`) : motivo,
          ventaId,
          usuarioId: usuarioFinal,
          createdAt: fechaCreacion,
        },
        include: {
          producto: { include: { categoria: true } },
          usuario: { select: { id: true, nombre: true, email: true } },
          venta: { select: { id: true, total: true, metodoPago: true } },
        },
      });

      await tx.producto.update({
        where: { id: parseInt(productoId) },
        data: { stock: nuevoStock },
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
      include: { producto: true },
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
    const diferencia = cantidadNueva - movimientoOriginal.cantidad;
    let nuevoStock = movimientoOriginal.producto.stock;

    if (diferencia !== 0) {
      nuevoStock += movimientoOriginal.tipo === 'ENTRADA' ? diferencia : -diferencia;
      if (nuevoStock < 0) {
        return NextResponse.json(
          { error: `Stock insuficiente. El stock quedaría en ${nuevoStock}` },
          { status: 400 }
        );
      }
    }

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
          venta: { select: { id: true, total: true, metodoPago: true } },
        },
      });

      if (diferencia !== 0) {
        await tx.producto.update({
          where: { id: movimientoOriginal.productoId },
          data: { stock: nuevoStock },
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