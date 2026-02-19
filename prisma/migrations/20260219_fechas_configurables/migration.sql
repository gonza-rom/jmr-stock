-- Migration: Hacer createdAt configurable en Venta y Movimiento
-- Fecha: 2026-02-19

-- 1. Primero, quitamos el DEFAULT de las columnas
ALTER TABLE "Movimiento" ALTER COLUMN "createdAt" DROP DEFAULT;
ALTER TABLE "Venta" ALTER COLUMN "createdAt" DROP DEFAULT;

-- 2. Para los registros existentes, mantenemos su fecha actual
-- (No es necesario hacer nada, ya tienen valores)

-- Nota: A partir de ahora, al crear una Venta o Movimiento,
-- deberás especificar explícitamente el valor de createdAt en el código.