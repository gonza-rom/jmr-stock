// app/api/productos/route.js - CON PAGINACIÓN SERVER-SIDE

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper: convierte string vacío o undefined a null
function toNullIfEmpty(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

// GET - Obtener productos con paginación y búsqueda server-side
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Modo destacados (home page) - retorna array sin paginar
    const destacados = searchParams.get('destacados');
    if (destacados === 'true') {
      const limit = parseInt(searchParams.get('limit') || '8');
      const productos = await prisma.producto.findMany({
        include: { categoria: true, proveedor: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return NextResponse.json(productos);
    }

    // ── Paginación ──
    const page     = Math.max(1, parseInt(searchParams.get('page')     || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '12')));
    const skip     = (page - 1) * pageSize;

    // ── Filtros ──
    const busqueda   = searchParams.get('busqueda')  || '';
    const categoriaId = searchParams.get('categoria') || '';
    const ordenar    = searchParams.get('ordenar')   || 'nombre';

    // Construir where
    const where = {};

    if (busqueda.trim()) {
      where.OR = [
        { nombre:        { contains: busqueda, mode: 'insensitive' } },
        { descripcion:   { contains: busqueda, mode: 'insensitive' } },
        { codigoProducto:{ contains: busqueda, mode: 'insensitive' } },
        { codigoBarras:  { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    if (categoriaId) {
      where.categoriaId = parseInt(categoriaId);
    }

    // Construir orderBy
    let orderBy = { nombre: 'asc' };
    switch (ordenar) {
      case 'precio-asc':  orderBy = { precio: 'asc'  }; break;
      case 'precio-desc': orderBy = { precio: 'desc' }; break;
      case 'nombre':      orderBy = { nombre: 'asc'  }; break;
      case 'recientes':   orderBy = { createdAt: 'desc' }; break;
    }

    // Ejecutar ambas queries en paralelo
    const [productos, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        include: { categoria: true, proveedor: true },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.producto.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      productos,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST - Crear nuevo producto
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      nombre, descripcion, precio, stock, stockMinimo,
      imagen, imagenes, categoriaId, proveedorId,
      codigoBarras, codigoProducto,
    } = body;

    if (!nombre || precio === undefined || precio === '' || !categoriaId || !proveedorId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: nombre, precio, categoriaId, proveedorId' },
        { status: 400 }
      );
    }

    const codigoProductoFinal = toNullIfEmpty(codigoProducto);
    const codigoBarrasFinal   = toNullIfEmpty(codigoBarras);

    // Verificar unicidad manualmente para dar mejor mensaje de error
    if (codigoProductoFinal) {
      const existente = await prisma.producto.findUnique({ where: { codigoProducto: codigoProductoFinal } });
      if (existente) {
        return NextResponse.json(
          { error: `El código de producto "${codigoProductoFinal}" ya está en uso por: ${existente.nombre}` },
          { status: 409 }
        );
      }
    }

    if (codigoBarrasFinal) {
      const existente = await prisma.producto.findUnique({ where: { codigoBarras: codigoBarrasFinal } });
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
        codigoBarras:   codigoBarrasFinal,
        codigoProducto: codigoProductoFinal,
      },
      include: { categoria: true, proveedor: true },
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0];
      if (field === 'codigoBarras')   return NextResponse.json({ error: 'El código de barras ya existe en otro producto'  }, { status: 409 });
      if (field === 'codigoProducto') return NextResponse.json({ error: 'El código de producto ya existe en otro producto' }, { status: 409 });
      return NextResponse.json({ error: 'Ya existe un producto con ese código' }, { status: 409 });
    }
    console.error('Error al crear producto:', error);
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}