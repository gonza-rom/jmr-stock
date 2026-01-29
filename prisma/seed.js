const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed de la base de datos...')

  // Limpiar datos existentes
  await prisma.movimiento.deleteMany()
  await prisma.producto.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.proveedor.deleteMany()

  // Crear categorías
  const categorias = await Promise.all([
    prisma.categoria.create({
      data: {
        nombre: 'Electrónica',
        descripcion: 'Productos electrónicos y tecnológicos',
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: 'Alimentos',
        descripcion: 'Productos alimenticios y bebidas',
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: 'Limpieza',
        descripcion: 'Productos de limpieza e higiene',
      },
    }),
    prisma.categoria.create({
      data: {
        nombre: 'Papelería',
        descripcion: 'Útiles escolares y de oficina',
      },
    }),
  ])

  console.log('✓ Categorías creadas')

  // Crear proveedores
  const proveedores = await Promise.all([
    prisma.proveedor.create({
      data: {
        nombre: 'Tech Solutions SA',
        telefono: '+54 383 4123456',
        email: 'ventas@techsolutions.com',
        direccion: 'Av. Belgrano 123, Catamarca',
      },
    }),
    prisma.proveedor.create({
      data: {
        nombre: 'Distribuidora Central',
        telefono: '+54 383 4234567',
        email: 'pedidos@distcentral.com',
        direccion: 'Calle San Martín 456, Catamarca',
      },
    }),
    prisma.proveedor.create({
      data: {
        nombre: 'Mayorista del Norte',
        telefono: '+54 383 4345678',
        email: 'info@mayoristandelnorte.com',
        direccion: 'Ruta 38 Km 5, Catamarca',
      },
    }),
  ])

  console.log('✓ Proveedores creados')

  // Crear productos
  const productos = await Promise.all([
    // Electrónica
    prisma.producto.create({
      data: {
        nombre: 'Mouse Inalámbrico Logitech',
        descripcion: 'Mouse inalámbrico con sensor óptico de alta precisión',
        precio: 15000,
        stock: 25,
        stockMinimo: 10,
        categoriaId: categorias[0].id,
        proveedorId: proveedores[0].id,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Teclado Mecánico RGB',
        descripcion: 'Teclado mecánico con retroiluminación RGB',
        precio: 45000,
        stock: 8,
        stockMinimo: 5,
        categoriaId: categorias[0].id,
        proveedorId: proveedores[0].id,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Cable HDMI 2m',
        descripcion: 'Cable HDMI 2.0 de alta velocidad',
        precio: 3500,
        stock: 45,
        stockMinimo: 20,
        categoriaId: categorias[0].id,
        proveedorId: proveedores[0].id,
      },
    }),
    // Alimentos
    prisma.producto.create({
      data: {
        nombre: 'Aceite Girasol 900ml',
        descripcion: 'Aceite de girasol refinado',
        precio: 1200,
        stock: 60,
        stockMinimo: 30,
        categoriaId: categorias[1].id,
        proveedorId: proveedores[1].id,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Arroz Largo Fino 1kg',
        descripcion: 'Arroz largo fino de primera calidad',
        precio: 800,
        stock: 3,
        stockMinimo: 20,
        categoriaId: categorias[1].id,
        proveedorId: proveedores[1].id,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Fideos Tirabuzón 500g',
        descripcion: 'Pasta tipo tirabuzón',
        precio: 650,
        stock: 80,
        stockMinimo: 40,
        categoriaId: categorias[1].id,
        proveedorId: proveedores[1].id,
      },
    }),
    // Limpieza
    prisma.producto.create({
      data: {
        nombre: 'Detergente Líquido 750ml',
        descripcion: 'Detergente líquido para ropa',
        precio: 2500,
        stock: 35,
        stockMinimo: 15,
        categoriaId: categorias[2].id,
        proveedorId: proveedores[2].id,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Lavandina 1L',
        descripcion: 'Lavandina concentrada',
        precio: 900,
        stock: 4,
        stockMinimo: 10,
        categoriaId: categorias[2].id,
        proveedorId: proveedores[2].id,
      },
    }),
    // Papelería
    prisma.producto.create({
      data: {
        nombre: 'Cuaderno Tapa Dura 100 hojas',
        descripcion: 'Cuaderno universitario rayado',
        precio: 1800,
        stock: 50,
        stockMinimo: 20,
        categoriaId: categorias[3].id,
        proveedorId: proveedores[2].id,
      },
    }),
    prisma.producto.create({
      data: {
        nombre: 'Bolígrafo Negro (Pack x10)',
        descripcion: 'Pack de 10 bolígrafos negros',
        precio: 1500,
        stock: 30,
        stockMinimo: 15,
        categoriaId: categorias[3].id,
        proveedorId: proveedores[2].id,
      },
    }),
  ])

  console.log('✓ Productos creados')

  // Crear algunos movimientos de ejemplo
  await Promise.all([
    prisma.movimiento.create({
      data: {
        productoId: productos[0].id,
        tipo: 'ENTRADA',
        cantidad: 20,
        motivo: 'Compra inicial de stock',
      },
    }),
    prisma.movimiento.create({
      data: {
        productoId: productos[0].id,
        tipo: 'SALIDA',
        cantidad: 5,
        motivo: 'Venta al cliente',
      },
    }),
    prisma.movimiento.create({
      data: {
        productoId: productos[4].id,
        tipo: 'SALIDA',
        cantidad: 17,
        motivo: 'Venta mayorista',
      },
    }),
  ])

  console.log('✓ Movimientos creados')

  console.log(`
  ✅ Seed completado exitosamente!
  
  📊 Datos creados:
  - ${categorias.length} categorías
  - ${proveedores.length} proveedores
  - ${productos.length} productos
  - 3 movimientos de ejemplo
  
  🎯 Productos con stock bajo detectados:
  - Arroz Largo Fino 1kg (Stock: 3, Mínimo: 20)
  - Lavandina 1L (Stock: 4, Mínimo: 10)
  `)
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })