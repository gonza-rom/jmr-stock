# JMR Stock - Sistema de Control de Stock

Sistema Full Stack para gestión de inventario y control de stock desarrollado con Next.js 15, Prisma ORM y PostgreSQL.

## 📋 Descripción

Aplicación web diseñada para comercios que necesitan llevar un control eficiente de su inventario. Permite gestionar productos, categorías, proveedores y registrar movimientos de entrada/salida de stock con alertas automáticas para productos con stock bajo.

## 🚀 Características Implementadas

### Requisitos Obligatorios Cumplidos ✅

- **Frontend Completo**: Interfaz moderna y responsive con Tailwind CSS
- **Navbar**: Barra de navegación funcional con enlaces a todas las secciones
- **4 Entidades/Modelos**:
  1. Categorías
  2. Proveedores
  3. Productos
  4. Movimientos

- **Relaciones entre Entidades**:
  - Categorías ↔ Productos (uno a muchos)
  - Proveedores ↔ Productos (uno a muchos)
  - Productos ↔ Movimientos (uno a muchos)

- **APIs Implementadas** (4 APIs en total):
  1. **API Categorías** (GET, POST) - `/api/categorias`
  2. **API Proveedores** (GET, POST) - `/api/proveedores`
  3. **API Movimientos** (GET, POST) - `/api/movimientos`
  4. **API Productos (Dinámica - CRUD Completo)**:
     - GET general: `/api/productos`
     - POST: `/api/productos`
     - GET por ID: `/api/productos/[id]`
     - PUT por ID: `/api/productos/[id]`
     - DELETE por ID: `/api/productos/[id]`

- **CRUD Completo**: Implementado para Productos (crear, leer, actualizar, eliminar)

## 🛠️ Tecnologías Utilizadas

- **Framework**: Next.js 15 (App Router)
- **Lenguaje**: JavaScript (ES6+)
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **Deployment**: Vercel (compatible)

## 📦 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ instalado
- PostgreSQL instalado y corriendo
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <tu-repositorio>
cd jmr-stock
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/jmr_stock?schema=public"
```

Para Vercel o producción con SSL:
```env
DATABASE_URL="postgresql://usuario:password@host/database?sslmode=require"
```

4. **Configurar la base de datos**

```bash
# Crear las tablas en la base de datos
npx prisma db push

# (Opcional) Cargar datos de ejemplo
npx prisma db seed

# (Opcional) Abrir Prisma Studio para ver los datos
npx prisma studio
```

5. **Ejecutar en desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🎯 Flujo de la Aplicación

### 1. Dashboard (Página Principal)
- Muestra estadísticas generales del inventario
- Productos totales, categorías y proveedores
- Alertas de productos con stock bajo
- Últimos movimientos registrados

### 2. Gestión de Categorías
- Ver todas las categorías existentes
- Crear nuevas categorías con nombre y descripción
- Visualizar cantidad de productos por categoría

### 3. Gestión de Proveedores
- Ver todos los proveedores
- Registrar nuevos proveedores con datos de contacto
- Ver cantidad de productos suministrados por cada proveedor

### 4. Gestión de Productos (CRUD Completo)
- **Listar**: Ver todos los productos con información completa
- **Crear**: Agregar nuevos productos con categoría y proveedor
- **Editar**: Modificar información de productos existentes
- **Eliminar**: Borrar productos del sistema
- Alertas visuales para productos con stock bajo

### 5. Movimientos de Stock
- Registrar entradas de stock (compras, devoluciones)
- Registrar salidas de stock (ventas, pérdidas)
- Actualización automática del stock de productos
- Validación para evitar stock negativo
- Historial completo de movimientos

## 📊 Estructura de la Base de Datos

```
Categoria
├── id (Int, PK)
├── nombre (String, Unique)
├── descripcion (String?)
├── productos (Relation)
└── timestamps

Proveedor
├── id (Int, PK)
├── nombre (String)
├── telefono (String?)
├── email (String?, Unique)
├── direccion (String?)
├── productos (Relation)
└── timestamps

Producto
├── id (Int, PK)
├── nombre (String)
├── descripcion (String?)
├── precio (Float)
├── stock (Int)
├── stockMinimo (Int)
├── categoriaId (FK)
├── proveedorId (FK)
├── movimientos (Relation)
└── timestamps

Movimiento
├── id (Int, PK)
├── productoId (FK)
├── tipo (String: ENTRADA/SALIDA)
├── cantidad (Int)
├── motivo (String?)
└── createdAt
```

## 🔌 Endpoints de la API

### Categorías
- `GET /api/categorias` - Listar todas las categorías
- `POST /api/categorias` - Crear nueva categoría

### Proveedores
- `GET /api/proveedores` - Listar todos los proveedores
- `POST /api/proveedores` - Crear nuevo proveedor

### Productos (CRUD Dinámico)
- `GET /api/productos` - Listar todos los productos
- `POST /api/productos` - Crear nuevo producto
- `GET /api/productos/[id]` - Obtener producto por ID
- `PUT /api/productos/[id]` - Actualizar producto por ID
- `DELETE /api/productos/[id]` - Eliminar producto por ID

### Movimientos
- `GET /api/movimientos` - Listar movimientos (últimos 100)
- `POST /api/movimientos` - Registrar nuevo movimiento

## 🚀 Despliegue en Vercel

1. **Preparar base de datos PostgreSQL en la nube**
   - Opciones: Supabase, Neon, Railway, AWS RDS

2. **Configurar variables de entorno en Vercel**
   - Agregar `DATABASE_URL` en Project Settings → Environment Variables

3. **Deploy**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel

# O conectar el repositorio desde vercel.com
```

4. **Después del deploy**
```bash
# Ejecutar migraciones en producción
npx prisma migrate deploy
```

## 📝 Uso del Sistema

### Flujo Recomendado para Empezar

1. **Crear Categorías**: Ir a "Categorías" y crear las categorías de productos
2. **Crear Proveedores**: Ir a "Proveedores" y registrar proveedores
3. **Crear Productos**: Ir a "Productos" → "Nuevo Producto"
4. **Registrar Movimientos**: Usar "Movimientos" para registrar entradas/salidas

### Funcionalidades Destacadas

- **Alertas de Stock Bajo**: El sistema muestra alertas cuando un producto tiene stock menor o igual al mínimo configurado
- **Validación de Stock**: No permite salidas de stock que dejen el inventario en negativo
- **Actualización Automática**: Los movimientos actualizan automáticamente el stock de productos
- **Interfaz Intuitiva**: Navegación clara y diseño responsive

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar en producción
npm start

# Linting
npm run lint

# Prisma Studio (visualizar BD)
npx prisma studio

# Generar Prisma Client
npx prisma generate
```

## 🎨 Características Adicionales

- Diseño responsive para móviles y tablets
- Interfaz moderna con Tailwind CSS
- Iconos intuitivos con Lucide React
- Validación de formularios
- Mensajes de confirmación para acciones destructivas
- Feedback visual para el usuario

## 📄 Licencia

Proyecto desarrollado como trabajo práctico final del curso Next.js + Prisma ORM.

## 👨‍💻 Autor

Trabajo Práctico Final - Curso Next.js + Prisma ORM
Fecha de entrega: 17/12/2025

---

## 🔗 Enlaces

- **Repositorio**: [URL del repositorio en GitHub]
- **Demo en Vivo**: [URL del despliegue en Vercel]
- **Formulario de Entrega**: https://cursonextjs.fillout.com/cohorte1

---

**Nota**: Este proyecto cumple con todos los requisitos obligatorios del trabajo práctico final.