const fs = require('fs');
const crypto = require('crypto');

function generateUUID() {
  return crypto.randomUUID();
}

const csvContent = fs.readFileSync('data/Base_Maestra_Piloto_Beneficios_CLA_v3.csv', 'utf8');
const lines = csvContent.trim().split('\n').slice(1); // skip header

const localidadesMap = new Map(); // name -> id
const clientesMap = new Map(); // dni -> {dni, nombre, localidad_id}
const agroveterinariasMap = new Map(); // name -> {id, nombre, localidad_id}
const productosMap = new Map(); // name -> {id, nombre}
const agroProductosSet = new Set(); // agroveterinaria_id_producto_id -> {agro_id, prod_id, precio, descuento}

lines.forEach(line => {
  const parts = line.split(';');
  if (parts.length < 11) return;
  
  const dni = parts[1].trim();
  const clienteNombre = parts[2].trim();
  const localidadNombre = parts[3].trim();
  const agroveterinariaNombre = parts[4].trim();
  const productoNombre = parts[5].trim();
  const precioLista = parseFloat(parts[6].trim());
  const descuentoPct = parseFloat(parts[7].trim());

  // 1. Localidades
  if (!localidadesMap.has(localidadNombre)) {
    localidadesMap.set(localidadNombre, generateUUID());
  }
  const localidadId = localidadesMap.get(localidadNombre);

  // 2. Clientes
  if (!clientesMap.has(dni)) {
    clientesMap.set(dni, { dni, nombre: clienteNombre, localidad_id: localidadId });
  }

  // 3. Agroveterinarias
  const agroKey = `${agroveterinariaNombre}_${localidadId}`;
  if (!agroveterinariasMap.has(agroKey)) {
    agroveterinariasMap.set(agroKey, { id: generateUUID(), nombre: agroveterinariaNombre, localidad_id: localidadId });
  }
  const agroId = agroveterinariasMap.get(agroKey).id;

  // 4. Productos
  if (!productosMap.has(productoNombre)) {
    productosMap.set(productoNombre, { id: generateUUID(), nombre: productoNombre });
  }
  const productoId = productosMap.get(productoNombre).id;

  // 5. Agroveterinaria_Productos
  const agroProdKey = `${agroId}_${productoId}`;
  if (!agroProductosSet.has(agroProdKey)) {
    agroProductosSet.add(JSON.stringify({
      agroveterinaria_id: agroId,
      producto_id: productoId,
      precio_venta: precioLista,
      descuento_pct: descuentoPct
    }));
  }
});

let sql = `
-- ==========================================
-- CAJA LOS ANDES - MVP AGROVETERINARIAS v2
-- Esquema Relacional y Datos Base Maestro
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP TABLES IF EXIST (Para reinicio seguro)
DROP TABLE IF EXISTS public.canjes CASCADE;
DROP TABLE IF EXISTS public.agroveterinaria_productos CASCADE;
DROP TABLE IF EXISTS public.productos CASCADE;
DROP TABLE IF EXISTS public.agroveterinarias CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.localidades CASCADE;

-- 2. CREACIÓN DE TABLAS

CREATE TABLE public.localidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE public.clientes (
    dni VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    localidad_id UUID NOT NULL REFERENCES public.localidades(id) ON DELETE RESTRICT
);

CREATE TABLE public.agroveterinarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    localidad_id UUID NOT NULL REFERENCES public.localidades(id) ON DELETE RESTRICT,
    UNIQUE(nombre, localidad_id)
);

CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE public.agroveterinaria_productos (
    agroveterinaria_id UUID NOT NULL REFERENCES public.agroveterinarias(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    precio_venta DECIMAL(10,2) NOT NULL,
    descuento_pct DECIMAL(5,2) NOT NULL,
    PRIMARY KEY (agroveterinaria_id, producto_id)
);

CREATE TABLE public.canjes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_dni VARCHAR(20) NOT NULL REFERENCES public.clientes(dni) ON DELETE RESTRICT UNIQUE,
    agroveterinaria_id UUID NOT NULL REFERENCES public.agroveterinarias(id) ON DELETE RESTRICT,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    precio DECIMAL(10,2) NOT NULL,
    descuento_pct DECIMAL(5,2) NOT NULL,
    monto_descontado DECIMAL(10,2) NOT NULL,
    total_pagado DECIMAL(10,2) NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNCIONES RPC

CREATE OR REPLACE FUNCTION registrar_beneficio_v2(
    p_cliente_dni VARCHAR,
    p_agroveterinaria_id UUID,
    p_producto_id UUID,
    p_precio DECIMAL,
    p_descuento_pct DECIMAL,
    p_monto_descontado DECIMAL,
    p_total_pagado DECIMAL
) RETURNS JSON AS $$
DECLARE
    v_uso_id UUID;
BEGIN
    -- Intentar insertar (El constraint UNIQUE en cliente_dni evitará canjes duplicados, levantando error)
    INSERT INTO public.canjes (
        cliente_dni, agroveterinaria_id, producto_id, 
        precio, descuento_pct, monto_descontado, total_pagado
    ) VALUES (
        p_cliente_dni, p_agroveterinaria_id, p_producto_id,
        p_precio, p_descuento_pct, p_monto_descontado, p_total_pagado
    ) RETURNING id INTO v_uso_id;

    RETURN json_build_object('success', true, 'uso_id', v_uso_id);
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'El beneficio ya fue utilizado por este cliente';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.localidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agroveterinarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agroveterinaria_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canjes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.localidades FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.agroveterinarias FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.agroveterinaria_productos FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.canjes FOR SELECT USING (true);
CREATE POLICY "Allow public insert canjes" ON public.canjes FOR INSERT WITH CHECK (true);

-- 5. DATOS MAESTROS (INSERTS DESDE CSV)
`;

// Insert Localidades
sql += `\n-- Localidades\n`;
for (const [nombre, id] of localidadesMap.entries()) {
  sql += `INSERT INTO public.localidades (id, nombre) VALUES ('${id}', '${nombre}');\n`;
}

// Insert Clientes
sql += `\n-- Clientes\n`;
for (const [dni, c] of clientesMap.entries()) {
  sql += `INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('${c.dni}', '${c.nombre}', '${c.localidad_id}');\n`;
}

// Insert Agroveterinarias
sql += `\n-- Agroveterinarias\n`;
for (const [key, a] of agroveterinariasMap.entries()) {
  sql += `INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('${a.id}', '${a.nombre}', '${a.localidad_id}');\n`;
}

// Insert Productos
sql += `\n-- Productos\n`;
for (const [nombre, p] of productosMap.entries()) {
  sql += `INSERT INTO public.productos (id, nombre) VALUES ('${p.id}', '${p.nombre}');\n`;
}

// Insert Agroveterinaria_Productos
sql += `\n-- Agroveterinaria_Productos\n`;
for (const itemStr of agroProductosSet) {
  const ap = JSON.parse(itemStr);
  sql += `INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('${ap.agroveterinaria_id}', '${ap.producto_id}', ${ap.precio_venta}, ${ap.descuento_pct});\n`;
}

fs.writeFileSync('schema_and_seed_v2.sql', sql, 'utf8');
console.log('schema_and_seed_v2.sql generated successfully.');
