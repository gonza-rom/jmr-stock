// prisma/debug-codigos.js
// Ejecutar con: node prisma/debug-codigos.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('='.repeat(60))
  console.log('DEBUG COMPLETO DE CÓDIGOS DE PRODUCTOS')
  console.log('='.repeat(60))

  // 1. Todos los productos con sus códigos
  const todos = await prisma.producto.findMany({
    select: { id: true, nombre: true, codigoProducto: true, codigoBarras: true },
    orderBy: { id: 'asc' }
  })

  console.log(`\nTotal productos en BD: ${todos.length}\n`)
  console.log('ID  | codigoProducto          | codigoBarras            | nombre')
  console.log('-'.repeat(80))
  todos.forEach(p => {
    const cp = p.codigoProducto === null ? 'NULL' : p.codigoProducto === '' ? '""(VACIO)' : `"${p.codigoProducto}"`
    const cb = p.codigoBarras === null ? 'NULL' : p.codigoBarras === '' ? '""(VACIO)' : `"${p.codigoBarras}"`
    console.log(`${String(p.id).padEnd(4)}| ${cp.padEnd(24)}| ${cb.padEnd(24)}| ${p.nombre}`)
  })

  // 2. Buscar duplicados
  console.log('\n' + '='.repeat(60))
  console.log('BUSCANDO DUPLICADOS Y PROBLEMAS')
  console.log('='.repeat(60))

  const cpVacios = todos.filter(p => p.codigoProducto === '')
  const cbVacios = todos.filter(p => p.codigoBarras === '')
  const cpNull = todos.filter(p => p.codigoProducto === null)

  console.log(`\ncodigoProducto vacío "": ${cpVacios.length} productos`)
  cpVacios.forEach(p => console.log(`  → ID ${p.id}: ${p.nombre}`))

  console.log(`codigoBarras vacío "": ${cbVacios.length} productos`)
  cbVacios.forEach(p => console.log(`  → ID ${p.id}: ${p.nombre}`))

  console.log(`codigoProducto NULL: ${cpNull.length} productos`)

  // 3. Buscar duplicados reales (mismo valor no-null)
  const cpCounts = {}
  todos.forEach(p => {
    if (p.codigoProducto !== null) {
      cpCounts[p.codigoProducto] = (cpCounts[p.codigoProducto] || 0) + 1
    }
  })
  const duplicados = Object.entries(cpCounts).filter(([_, count]) => count > 1)
  if (duplicados.length > 0) {
    console.log('\n⚠️  CÓDIGOS DUPLICADOS:')
    duplicados.forEach(([codigo, count]) => {
      console.log(`  "${codigo}" aparece ${count} veces`)
    })
  }

  // 4. Intentar fix automático
  console.log('\n' + '='.repeat(60))
  console.log('APLICANDO FIX...')
  console.log('='.repeat(60))

  if (cpVacios.length > 0) {
    // Actualizar uno por uno para evitar problemas
    for (const p of cpVacios) {
      await prisma.producto.update({
        where: { id: p.id },
        data: { codigoProducto: null }
      })
      console.log(`✅ ID ${p.id} (${p.nombre}): codigoProducto "" → null`)
    }
  }

  if (cbVacios.length > 0) {
    for (const p of cbVacios) {
      await prisma.producto.update({
        where: { id: p.id },
        data: { codigoBarras: null }
      })
      console.log(`✅ ID ${p.id} (${p.nombre}): codigoBarras "" → null`)
    }
  }

  if (cpVacios.length === 0 && cbVacios.length === 0) {
    console.log('\n⚠️  No hay vacíos. El problema es OTRO.')
    console.log('\nVerificando el schema de Prisma vs la base de datos...')
    
    // Intentar crear un producto de prueba para ver el error exacto
    console.log('\nIntentando crear producto de prueba con codigoProducto = null...')
    try {
      const test = await prisma.producto.create({
        data: {
          nombre: '__TEST_DELETE_ME__',
          precio: 1,
          stock: 0,
          stockMinimo: 1,
          codigoProducto: null,
          codigoBarras: null,
          categoriaId: todos[0]?.categoriaId || 1,
          proveedorId: todos[0]?.proveedorId || 1,
          imagenes: [],
        }
      })
      console.log(`✅ Producto de prueba creado con ID ${test.id}`)
      await prisma.producto.delete({ where: { id: test.id } })
      console.log(`✅ Producto de prueba eliminado`)
      console.log('\n→ La BD acepta null. El error viene del FRONTEND enviando un valor no-null.')
      console.log('→ Verificá que el archivo app/api/productos/route.js fue reemplazado correctamente.')
    } catch (err) {
      console.log(`❌ Error al crear prueba: ${err.message}`)
      console.log('\nEste es el error real que necesitamos resolver.')
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('FIN DEL DEBUG')
  console.log('='.repeat(60))
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })