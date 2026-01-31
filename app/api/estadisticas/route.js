import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');

    const where = {};
    
    if (fechaInicio && fechaFin) {
      where.createdAt = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin + 'T23:59:59')
      };
    }

    // Obtener todas las ventas del período
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
        }
      }
    });

    // Calcular estadísticas
    const totalVentas = ventas.length;
    const ingresoTotal = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const promedioVenta = totalVentas > 0 ? ingresoTotal / totalVentas : 0;

    // Productos más vendidos
    const productosVendidos = {};
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        if (!productosVendidos[item.productoId]) {
          productosVendidos[item.productoId] = {
            producto: item.producto,
            cantidadVendida: 0,
            ingresoGenerado: 0
          };
        }
        productosVendidos[item.productoId].cantidadVendida += item.cantidad;
        productosVendidos[item.productoId].ingresoGenerado += item.subtotal;
      });
    });

    const productosMasVendidos = Object.values(productosVendidos)
      .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
      .slice(0, 10);

    // Ventas por categoría
    const ventasPorCategoria = {};
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        const categoria = item.producto.categoria.nombre;
        if (!ventasPorCategoria[categoria]) {
          ventasPorCategoria[categoria] = {
            nombre: categoria,
            cantidad: 0,
            ingreso: 0
          };
        }
        ventasPorCategoria[categoria].cantidad += item.cantidad;
        ventasPorCategoria[categoria].ingreso += item.subtotal;
      });
    });

    // Ventas por método de pago
    const ventasPorMetodo = {};
    ventas.forEach(venta => {
      if (!ventasPorMetodo[venta.metodoPago]) {
        ventasPorMetodo[venta.metodoPago] = {
          metodo: venta.metodoPago,
          cantidad: 0,
          total: 0
        };
      }
      ventasPorMetodo[venta.metodoPago].cantidad++;
      ventasPorMetodo[venta.metodoPago].total += venta.total;
    });

    // Ventas por día (últimos 30 días)
    const ventasPorDia = {};
    ventas.forEach(venta => {
      const fecha = new Date(venta.createdAt).toISOString().split('T')[0];
      if (!ventasPorDia[fecha]) {
        ventasPorDia[fecha] = {
          fecha,
          cantidad: 0,
          total: 0
        };
      }
      ventasPorDia[fecha].cantidad++;
      ventasPorDia[fecha].total += venta.total;
    });

    const ventasPorDiaArray = Object.values(ventasPorDia)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Ventas por mes (últimos 12 meses)
    const ventasPorMes = {};
    ventas.forEach(venta => {
      const fecha = new Date(venta.createdAt);
      const mesAnio = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      if (!ventasPorMes[mesAnio]) {
        ventasPorMes[mesAnio] = {
          mes: mesAnio,
          cantidad: 0,
          total: 0
        };
      }
      ventasPorMes[mesAnio].cantidad++;
      ventasPorMes[mesAnio].total += venta.total;
    });

    const ventasPorMesArray = Object.values(ventasPorMes)
      .sort((a, b) => a.mes.localeCompare(b.mes));

    return NextResponse.json({
      resumen: {
        totalVentas,
        ingresoTotal,
        promedioVenta
      },
      productosMasVendidos,
      ventasPorCategoria: Object.values(ventasPorCategoria),
      ventasPorMetodo: Object.values(ventasPorMetodo),
      ventasPorDia: ventasPorDiaArray,
      ventasPorMes: ventasPorMesArray
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}