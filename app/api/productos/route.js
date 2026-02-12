import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los productos
export async function GET() {
  try {
    const productos = await prisma.producto.findMany({
      include: {
        categoria: true,
        proveedor: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// Helper: convierte string vacío o undefined a null
function toNullIfEmpty(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

// POST - Crear nuevo producto
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, precio, stock, stockMinimo, imagen, imagenes, categoriaId, proveedorId, codigoBarras, codigoProducto } = body;

    if (!nombre || precio === undefined || precio === '' || !categoriaId || !proveedorId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, precio, categoriaId, proveedorId' },
        { status: 400 }
      );
    }

    // ✅ Usar helper para convertir vacíos a null - esto evita el error de unique constraint
    const codigoProductoFinal = toNullIfEmpty(codigoProducto);
    const codigoBarrasFinal = toNullIfEmpty(codigoBarras);

    // ✅ Verificar manualmente si el código ya existe (para dar mejor mensaje de error)
    if (codigoProductoFinal) {
      const existente = await prisma.producto.findUnique({
        where: { codigoProducto: codigoProductoFinal },
      });
      if (existente) {
        return NextResponse.json(
          { error: `El código de producto "${codigoProductoFinal}" ya está en uso por: ${existente.nombre}` },
          { status: 409 }
        );
      }
    }

    if (codigoBarrasFinal) {
      const existente = await prisma.producto.findUnique({
        where: { codigoBarras: codigoBarrasFinal },
      });
      if (existente) {
        return NextResponse.json(
          { error: `El código de barras "${codigoBarrasFinal}" ya está en uso por: ${existente.nombre}` },
          { status: 409 }
        );
      }
    }

    const producto = await prisma.producto.create({
      data: {
        nombre: nombre.trim(),
        descripcion: toNullIfEmpty(descripcion),
        precio: parseFloat(precio),
        stock: stock ? parseInt(stock) : 0,
        stockMinimo: stockMinimo !== undefined && stockMinimo !== '' ? parseInt(stockMinimo) : 5,
        imagen: toNullIfEmpty(imagen) || (Array.isArray(imagenes) && imagenes.length > 0 ? imagenes[0] : null),
        imagenes: Array.isArray(imagenes) ? imagenes : [],
        categoriaId: parseInt(categoriaId),
        proveedorId: parseInt(proveedorId),
        codigoBarras: codigoBarrasFinal,      // ✅ null si vacío
        codigoProducto: codigoProductoFinal,  // ✅ null si vacío
      },
      include: {
        categoria: true,
        proveedor: true,
      },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'codigoBarras') {
        return NextResponse.json(
          { error: 'El código de barras ya existe en otro producto' },
          { status: 409 }
        );
      } else if (field === 'codigoProducto') {
        return NextResponse.json(
          { error: 'El código de producto ya existe en otro producto' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 409 }
      );
    }
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}