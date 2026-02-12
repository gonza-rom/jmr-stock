// prisma/fix-codigos-vacios.js
// Ejecutar con: node prisma/fix-codigos-vacios.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando productos con códigos vacíos...\n')

  // Buscar productos con codigoProducto vacío
  const conCodigoVacio = await prisma.producto.findMany({
    where: { codigoProducto: '' },
    select: { id: true, nombre: true, codigoProducto: true, codigoBarras: true }
  })

  // Buscar productos con codigoBarras vacío
  const conBarrasVacio = await prisma.producto.findMany({
    where: { codigoBarras: '' },
    select: { id: true, nombre: true, codigoProducto: true, codigoBarras: true }
  })

  console.log(`Productos con codigoProducto = "": ${conCodigoVacio.length}`)
  conCodigoVacio.forEach(p => console.log(`  - ID ${p.id}: ${p.nombre}`))

  console.log(`\nProductos con codigoBarras = "": ${conBarrasVacio.length}`)
  conBarrasVacio.forEach(p => console.log(`  - ID ${p.id}: ${p.nombre}`))

  if (conCodigoVacio.length === 0 && conBarrasVacio.length === 0) {
    console.log('\n✅ No hay códigos vacíos. El problema puede ser otro.')
    console.log('\n🔍 Listando todos los productos con sus códigos:')
    const todos = await prisma.producto.findMany({
      select: { id: true, nombre: true, codigoProducto: true, codigoBarras: true },
      orderBy: { id: 'asc' }
    })
    todos.forEach(p => {
      console.log(`  ID ${p.id}: "${p.nombre}"`)
      console.log(`    codigoProducto: ${p.codigoProducto === null ? 'NULL' : `"${p.codigoProducto}"`}`)
      console.log(`    codigoBarras:   ${p.codigoBarras === null ? 'NULL' : `"${p.codigoBarras}"`}`)
    })
    return
  }

  // Corregir: convertir "" a null
  if (conCodigoVacio.length > 0) {
    const result = await prisma.producto.updateMany({
      where: { codigoProducto: '' },
      data: { codigoProducto: null }
    })
    console.log(`\n✅ Corregidos ${result.count} productos: codigoProducto "" → null`)
  }

  if (conBarrasVacio.length > 0) {
    const result = await prisma.producto.updateMany({
      where: { codigoBarras: '' },
      data: { codigoBarras: null }
    })
    console.log(`✅ Corregidos ${result.count} productos: codigoBarras "" → null`)
  }

  console.log('\n🎉 ¡Listo! Ahora podés agregar productos normalmente.')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
