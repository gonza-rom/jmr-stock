# 🏪 JMR Punto de Venta

Sistema integral de gestión comercial desarrollado para **Marroquinería JMR — Catamarca, Argentina**.

Incluye:

- 🛍 Punto de Venta (POS)
- 📦 Gestión de Inventario
- 🔄 Control de Movimientos de Stock
- 👥 Gestión de Usuarios y Roles
- 📊 Dashboard con métricas en tiempo real
- 🌐 Página pública para clientes
- 💰 Historial de precios
- 🏷 Gestión de Categorías y Proveedores

---

# 🚀 Tecnologías Utilizadas

- **Next.js 15 (App Router)** — Frontend + API Routes
- **Prisma 6** — ORM
- **PostgreSQL (Supabase)** — Base de datos
- **Cloudinary** — Almacenamiento de imágenes
- **Tailwind CSS** — Estilos
- **JWT** — Autenticación
- **lucide-react** — Iconos

---

# 🗂 Estructura del Proyecto

```bash
jmr-ecommerce/
├── app/
│   ├── page.js                  # Dashboard interno
│   ├── productos/               # ABM de productos
│   ├── ventas/                  # Punto de venta
│   ├── movimientos/             # Movimientos de stock
│   ├── usuarios/                # Gestión de usuarios
│   ├── categorias/              # Gestión de categorías
│   ├── proveedores/             # Gestión de proveedores
│   ├── public/                  # Página pública para clientes
│   └── api/                     # API Routes
├── prisma/
│   └── schema.prisma
├── contexts/
│   └── AuthContext.js
└── lib/
    └── prisma.js
```

---

# 🧩 Módulos del Sistema

## 📊 Dashboard

- Métricas en tiempo real:
  - Total de productos
  - Ventas del día
  - Productos con stock bajo
- Listado paginado de productos críticos
- Accesos rápidos a módulos principales

---

## 🛍 Punto de Venta (`/ventas`)

- Grilla de productos con búsqueda
- Paginación server-side (12 por página)
- Carrito con ajuste dinámico de cantidades
- Métodos de pago:
  - Efectivo
  - Débito
  - Crédito
  - Transferencia
  - QR
- Registro opcional de cliente (nombre y DNI)
- Edición rápida de producto desde la venta
- Creación rápida de producto sin salir del módulo
- Descuento automático de stock al confirmar venta

---

## 📦 Productos (`/productos`)

- Listado con:
  - Búsqueda debounced
  - Filtro por categoría
  - Ordenamiento
- Paginación server-side
- Galería multi-imagen (Cloudinary)
- Código interno y código de barras
- Control de stock mínimo con alertas

---

## 🔄 Movimientos (`/movimientos`)

- Registro de entradas y salidas de stock
- Búsqueda con sugerencias en tiempo real
- Cancelación de movimientos (solo ADMINISTRADOR)
- Reintegro automático de stock al cancelar
- Registro histórico con motivo de cancelación
- Filtrado local del historial

---

## 👥 Usuarios (`/usuarios`)

### Roles disponibles:

- `ADMINISTRADOR`
  - Acceso total
  - Cancelación de movimientos
  - Gestión de usuarios

- `EMPLEADO`
  - Acceso a ventas, productos y movimientos
  - Sin permisos administrativos

---

## 🏷 Categorías y Proveedores

- ABM completo
- Relacionados con productos
- Integración con filtros del sistema

---

## 🌐 Página Pública (`/public`)

Vitrina digital para clientes:

- Catálogo con imágenes
- Contacto directo por WhatsApp
- Links a Instagram y Facebook
- Información de sucursales
- No incluye checkout online (solo vitrina)

---

# 🗄 Base de Datos

- **PostgreSQL (Supabase)**
- ORM: **Prisma**

## Modelos Principales

- `Usuario`
- `Producto`
- `Categoria`
- `Proveedor`
- `Movimiento`
- `Venta`
- `VentaItem`
- `PrecioHistorico`

## 🔐 Autenticación

- JWT almacenado en cookie auth-token
- Control de acceso basado en roles
- Protección de rutas internas

## ⚙️ Variables de Entorno

Crear un archivo .env en la raíz del proyecto:

- DATABASE_URL=postgresql://...
- DIRECT_URL=postgresql://...
- NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
- NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...
- JWT_SECRET=...
- NEXT_PUBLIC_WHATSAPP_NUMBER=...
- NEXT_PUBLIC_BUSINESS_NAME=Marroquinería JMR
- NEXT_PUBLIC_BUSINESS_EMAIL=...
- NEXT_PUBLIC_BUSINESS_ADDRESS_1=...
- NEXT_PUBLIC_BUSINESS_ADDRESS_2=...
- NEXT_PUBLIC_INSTAGRAM=...
- NEXT_PUBLIC_FACEBOOK=...


- ⚠️ Si la contraseña contiene #, codificarlo como %23.

## 🚀 Instalación y Desarrollo
- npm install
- npx prisma generate
- npm run dev

## 🏗 Tipo de Sistema

- JMR Punto de Venta es un:

- Sistema web de gestión comercial con POS integrado y vitrina pública para retail minorista.

- No es solo un control de stock.
- Es un sistema integral para la operación diaria de un comercio físico.

## 📍 Sucursales

- Rivadavia 564 — San Fernando del Valle de Catamarca
- Av. Pte. Castillo 1165 — Valle Viejo
