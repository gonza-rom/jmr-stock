const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed de la base de datos...')

  // Limpiar datos existentes
  await prisma.movimiento.deleteMany()
  await prisma.ventaItem.deleteMany()
  await prisma.venta.deleteMany()
  await prisma.precioHistorico.deleteMany()
  await prisma.producto.deleteMany()
  await prisma.categoria.deleteMany()
  await prisma.proveedor.deleteMany()
  await prisma.usuario.deleteMany()

  // Crear usuarios
  console.log('Creando usuarios...')
  const adminPassword = await bcrypt.hash('admin123', 10)
  const empleadoPassword = await bcrypt.hash('empleado123', 10)

  const usuarios = await Promise.all([
    prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@jmr.com',
        password: adminPassword,
        rol: 'ADMINISTRADOR',
        activo: true,
      },
    }),
    prisma.usuario.create({
      data: {
        nombre: 'Juan Empleado',
        email: 'empleado@jmr.com',
        password: empleadoPassword,
        rol: 'EMPLEADO',
        activo: true,
      },
    }),
  ])

  console.log('✓ Usuarios creados')





  console.log(`
  ✅ Seed completado exitosamente!
  
  📊 Datos creados:
  - ${usuarios.length} usuarios (admin y empleado)
  - ${categorias.length} categorías
  - ${proveedores.length} proveedores
  - ${productos.length} productos
  
  👤 Usuarios de prueba:
  - Admin: admin@jmr.com / admin123
  - Empleado: empleado@jmr.com / empleado123
  
  `)
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })