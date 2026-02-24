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

// ══════════════════════════════════════════
// Busca o crea el producto especial "Varios"
// Se usa como productoId para ítems manuales
// ══════════════════════════════════════════
async function getOrCreateProductoVarios() {
  let producto = await prisma.producto.findFirst({
    where: { codigoProducto: '__VARIOS__' }
  });
  if (producto) return producto;

  let categoria = await prisma.categoria.findFirst({
    where: { nombre: 'Varios' }
  });
  if (!categoria) {
    categoria = await prisma.categoria.create({
      data: { nombre: 'Varios', descripcion: 'Artículos sin código / accesorios pequeños' }
    });
  }

  const proveedor = await prisma.proveedor.findFirst();
  if (!proveedor) {
    throw new Error('No hay proveedores registrados. Creá al menos uno antes de usar ítems manuales.');
  }

  producto = await prisma.producto.create({
    data: {
      nombre: 'Varios',
      codigoProducto: '__VARIOS__',
      precio: 0,
      stock: 999999,
      stockMinimo: 0,
      categoriaId: categoria.id,
      proveedorId: proveedor.id,
    }
  });

  return producto;
}

// GET
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
            producto: { include: { categoria: true } }
          }
        },
        movimientos: { include: { producto: true } },
        usuario: { select: { id: true, nombre: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

// POST
export async function POST(request) {
  try {
    const body = await request.json();
    const { items, metodoPago, clienteNombre, clienteDni, observaciones, fecha, hora, usuarioIdSeleccionado } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'La venta debe tener al menos un producto' }, { status: 400 });
    }
    if (!metodoPago) {
      return NextResponse.json({ error: 'El método de pago es requerido' }, { status: 400 });
    }

    const metodosValidos = ['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA', 'QR'];
    if (!metodosValidos.includes(metodoPago)) {
      return NextResponse.json({ error: 'Método de pago no válido' }, { status: 400 });
    }

    const user = await getUserFromToken();

    let usuarioIdFinal = user?.id || null;
    if (user?.rol === 'ADMINISTRADOR' && usuarioIdSeleccionado) {
      const parsed = parseInt(usuarioIdSeleccionado);
      if (!isNaN(parsed)) usuarioIdFinal = parsed;
    }

    const itemsNormales = items.filter(i => !i.esManual);
    const itemsManuales = items.filter(i => i.esManual);

    // Validar stock solo para ítems normales
    for (const item of itemsNormales) {
      const producto = await prisma.producto.findUnique({ where: { id: item.productoId } });
      if (!producto) {
        return NextResponse.json({ error: `Producto con ID ${item.productoId} no encontrado` }, { status: 404 });
      }
      if (producto.stock < item.cantidad) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}` },
          { status: 400 }
        );
      }
    }

    // Si hay ítems manuales, obtener/crear producto "Varios"
    let productoVarios = null;
    if (itemsManuales.length > 0) {
      productoVarios = await getOrCreateProductoVarios();
    }

    const total = items.reduce((sum, item) => sum + (item.precioUnit * item.cantidad), 0);

    let fechaVenta = new Date();
    if (fecha) {
      const p = fecha.split('-');
      if (hora) {
        // Hora manual: combinar fecha + hora elegida
        const [hh, mm] = hora.split(':').map(Number);
        fechaVenta = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]), hh, mm, 0);
      } else {
        // Sin hora manual: usar hora actual del servidor
        const ahora = new Date();
        fechaVenta = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]),
          ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());
      }
    }

    if (fechaVenta > new Date()) {
      return NextResponse.json({ error: 'No se puede crear una venta con fecha futura' }, { status: 400 });
    }

    const venta = await prisma.$transaction(async (tx) => {
      const todosLosItems = [
        ...itemsNormales.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
          subtotal: item.precioUnit * item.cantidad,
        })),
        ...itemsManuales.map(item => ({
          productoId: productoVarios.id,
          cantidad: item.cantidad,
          precioUnit: item.precioUnit,
          subtotal: item.precioUnit * item.cantidad,
        })),
      ];

      const nuevaVenta = await tx.venta.create({
        data: {
          total,
          metodoPago,
          clienteNombre,
          clienteDni,
          observaciones,
          usuarioId: usuarioIdFinal,
          createdAt: fechaVenta,
          items: { create: todosLosItems }
        },
        include: {
          items: { include: { producto: true } },
          usuario: { select: { id: true, nombre: true, email: true } }
        }
      });

      // Stock + movimiento solo para ítems normales
      for (const item of itemsNormales) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: { decrement: item.cantidad } }
        });
        await tx.movimiento.create({
          data: {
            productoId: item.productoId,
            tipo: 'VENTA',
            cantidad: item.cantidad,
            ventaId: nuevaVenta.id,
            motivo: `Venta #${nuevaVenta.id}`,
            usuarioId: usuarioIdFinal,
            createdAt: fechaVenta,
          }
        });
      }

      // Movimiento para ítems manuales — sin tocar stock
      for (const item of itemsManuales) {
        await tx.movimiento.create({
          data: {
            productoId: productoVarios.id,
            tipo: 'VENTA',
            cantidad: item.cantidad,
            ventaId: nuevaVenta.id,
            motivo: `Venta #${nuevaVenta.id} — ${item.descripcion || 'Varios'}`,
            usuarioId: usuarioIdFinal,
            createdAt: fechaVenta,
          }
        });
      }

      return nuevaVenta;
    });

    return NextResponse.json(venta, { status: 201 });
  } catch (error) {
    console.error('Error al crear venta:', error);
    return NextResponse.json({ error: 'Error al procesar la venta: ' + error.message }, { status: 500 });
  }
}