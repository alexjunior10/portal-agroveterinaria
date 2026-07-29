
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

-- Localidades
INSERT INTO public.localidades (id, nombre) VALUES ('cdc182cb-d134-429f-b86e-2b92d19dde6c', 'Asillo');
INSERT INTO public.localidades (id, nombre) VALUES ('7b121f82-9f22-4ed1-bbda-13c58b92a374', 'Ayaviri');
INSERT INTO public.localidades (id, nombre) VALUES ('866f0b37-55bb-49b2-9fc4-406d095fb6da', 'Azángaro');
INSERT INTO public.localidades (id, nombre) VALUES ('9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe', 'Chupaca');

-- Clientes
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000001', 'Cliente Asillo 001', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000002', 'Cliente Asillo 002', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000003', 'Cliente Asillo 003', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000004', 'Cliente Asillo 004', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000005', 'Cliente Asillo 005', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000006', 'Cliente Asillo 006', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000007', 'Cliente Asillo 007', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000008', 'Cliente Asillo 008', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000009', 'Cliente Asillo 009', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000010', 'Cliente Asillo 010', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000011', 'Cliente Asillo 011', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000012', 'Cliente Asillo 012', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000013', 'Cliente Asillo 013', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000014', 'Cliente Asillo 014', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000015', 'Cliente Asillo 015', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000016', 'Cliente Ayaviri 001', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000017', 'Cliente Ayaviri 002', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000018', 'Cliente Ayaviri 003', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000019', 'Cliente Ayaviri 004', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000020', 'Cliente Ayaviri 005', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000021', 'Cliente Ayaviri 006', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000022', 'Cliente Ayaviri 007', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000023', 'Cliente Ayaviri 008', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000024', 'Cliente Ayaviri 009', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000025', 'Cliente Ayaviri 010', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000026', 'Cliente Ayaviri 011', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000027', 'Cliente Ayaviri 012', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000028', 'Cliente Ayaviri 013', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000029', 'Cliente Ayaviri 014', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000030', 'Cliente Ayaviri 015', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000031', 'Cliente Azángaro 001', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000032', 'Cliente Azángaro 002', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000033', 'Cliente Azángaro 003', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000034', 'Cliente Azángaro 004', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000035', 'Cliente Azángaro 005', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000036', 'Cliente Azángaro 006', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000037', 'Cliente Azángaro 007', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000038', 'Cliente Azángaro 008', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000039', 'Cliente Azángaro 009', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000040', 'Cliente Azángaro 010', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000041', 'Cliente Azángaro 011', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000042', 'Cliente Azángaro 012', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000043', 'Cliente Azángaro 013', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000044', 'Cliente Azángaro 014', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000045', 'Cliente Azángaro 015', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000046', 'Cliente Chupaca 001', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000047', 'Cliente Chupaca 002', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000048', 'Cliente Chupaca 003', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000049', 'Cliente Chupaca 004', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000050', 'Cliente Chupaca 005', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000051', 'Cliente Chupaca 006', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000052', 'Cliente Chupaca 007', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000053', 'Cliente Chupaca 008', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000054', 'Cliente Chupaca 009', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000055', 'Cliente Chupaca 010', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000056', 'Cliente Chupaca 011', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000057', 'Cliente Chupaca 012', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000058', 'Cliente Chupaca 013', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000059', 'Cliente Chupaca 014', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.clientes (dni, nombre, localidad_id) VALUES ('70000060', 'Cliente Chupaca 015', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');

-- Agroveterinarias
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('43a1627d-b87b-45bc-ade2-ed46c2e430b2', 'AgroVet Asillo Centro', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('0cfb42a6-1bb0-40c5-b3dc-1f373584ebf0', 'Veterinaria San Isidro', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('473ea514-d63f-4898-aa20-d66b30100968', 'Campo Salud Animal', 'cdc182cb-d134-429f-b86e-2b92d19dde6c');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('b877e3f6-6880-4f18-adba-0c803c24dd64', 'AgroVet Ayaviri', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('d46d04f9-c43b-43d9-b4fa-6b749d447375', 'Veterinaria Melgar', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('6a308ba7-6541-445d-b974-69befb6c12c6', 'Campo Animal Ayaviri', '7b121f82-9f22-4ed1-bbda-13c58b92a374');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('50c5d41a-10e8-44ff-aa44-7300b57e9b24', 'AgroVet Azángaro', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('e8a773b8-68db-4a17-bce1-2ef9c254c177', 'Veterinaria Altiplano', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('ef59d332-cae2-4310-83c1-9737a68b8dfb', 'Agro Rural Azángaro', '866f0b37-55bb-49b2-9fc4-406d095fb6da');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('a28c33e3-b54b-47f1-86d1-d03dadde006d', 'AgroVet Chupaca', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('94206cfa-9047-4d48-888b-ec2f5cea6a9b', 'Veterinaria Valle Verde', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');
INSERT INTO public.agroveterinarias (id, nombre, localidad_id) VALUES ('83de4fb8-be1a-4b5e-9445-47eeec35f251', 'Campo Animal Chupaca', '9fbabfbc-7238-4bb3-a3b6-9245c7eaf5fe');

-- Productos
INSERT INTO public.productos (id, nombre) VALUES ('c49bdabf-f294-4feb-91d5-c7b1b42e9530', 'Antiparasitario Bovino');
INSERT INTO public.productos (id, nombre) VALUES ('d112af06-15d1-4258-a59b-517141e41bc3', 'Vitamina Complejo B');
INSERT INTO public.productos (id, nombre) VALUES ('391c2efb-dfaa-4d3e-aa1e-bfc9020cb058', 'Sales Minerales');
INSERT INTO public.productos (id, nombre) VALUES ('595a2b13-71df-4ecf-8d72-c49a61f3d6a0', 'Alimento Balanceado');
INSERT INTO public.productos (id, nombre) VALUES ('a9a1dd61-4f02-45ac-96e2-91bb95721aa0', 'Desinfectante Pecuario');
INSERT INTO public.productos (id, nombre) VALUES ('4d42050d-6ade-4ff6-b017-95b7898c61e5', 'Vacuna Triple');
INSERT INTO public.productos (id, nombre) VALUES ('0cec6bee-24c6-46c0-92e5-23b706b1fa68', 'Antibiótico');
INSERT INTO public.productos (id, nombre) VALUES ('f0e90328-290a-4141-bcff-8f9d0d75a4b1', 'Calcio Líquido');
INSERT INTO public.productos (id, nombre) VALUES ('4a07c9e1-94ca-45bc-a303-9d1c499d4611', 'Suplemento Energético');
INSERT INTO public.productos (id, nombre) VALUES ('7810bf6e-4cf2-400c-8a72-19e02e5719c1', 'Vitaminas ADE');
INSERT INTO public.productos (id, nombre) VALUES ('2da487d2-d8ec-4573-9429-137c38648e07', 'Antiparasitario Ovino');
INSERT INTO public.productos (id, nombre) VALUES ('ce9f279e-0777-484a-a2d2-352ec9880968', 'Probiótico');
INSERT INTO public.productos (id, nombre) VALUES ('5b196535-2e39-48b0-95e7-a33f6d014c99', 'Vacuna Carbunco');
INSERT INTO public.productos (id, nombre) VALUES ('e90f2d3f-6548-418a-9270-08f8cb04ab29', 'Mineral Plus');
INSERT INTO public.productos (id, nombre) VALUES ('4a8a605b-9509-464f-8d75-35e4ec11140d', 'Suero Rehidratante');

-- Agroveterinaria_Productos
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('43a1627d-b87b-45bc-ade2-ed46c2e430b2', 'c49bdabf-f294-4feb-91d5-c7b1b42e9530', 80, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('0cfb42a6-1bb0-40c5-b3dc-1f373584ebf0', 'd112af06-15d1-4258-a59b-517141e41bc3', 45, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('473ea514-d63f-4898-aa20-d66b30100968', '391c2efb-dfaa-4d3e-aa1e-bfc9020cb058', 60, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('43a1627d-b87b-45bc-ade2-ed46c2e430b2', '595a2b13-71df-4ecf-8d72-c49a61f3d6a0', 120, 10);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('0cfb42a6-1bb0-40c5-b3dc-1f373584ebf0', 'a9a1dd61-4f02-45ac-96e2-91bb95721aa0', 35, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('473ea514-d63f-4898-aa20-d66b30100968', '4d42050d-6ade-4ff6-b017-95b7898c61e5', 90, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('43a1627d-b87b-45bc-ade2-ed46c2e430b2', '0cec6bee-24c6-46c0-92e5-23b706b1fa68', 75, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('0cfb42a6-1bb0-40c5-b3dc-1f373584ebf0', 'f0e90328-290a-4141-bcff-8f9d0d75a4b1', 40, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('473ea514-d63f-4898-aa20-d66b30100968', '4a07c9e1-94ca-45bc-a303-9d1c499d4611', 55, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('43a1627d-b87b-45bc-ade2-ed46c2e430b2', '7810bf6e-4cf2-400c-8a72-19e02e5719c1', 50, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('0cfb42a6-1bb0-40c5-b3dc-1f373584ebf0', '2da487d2-d8ec-4573-9429-137c38648e07', 65, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('473ea514-d63f-4898-aa20-d66b30100968', 'ce9f279e-0777-484a-a2d2-352ec9880968', 48, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('43a1627d-b87b-45bc-ade2-ed46c2e430b2', '5b196535-2e39-48b0-95e7-a33f6d014c99', 88, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('0cfb42a6-1bb0-40c5-b3dc-1f373584ebf0', 'e90f2d3f-6548-418a-9270-08f8cb04ab29', 62, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('473ea514-d63f-4898-aa20-d66b30100968', '4a8a605b-9509-464f-8d75-35e4ec11140d', 22, 10);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('b877e3f6-6880-4f18-adba-0c803c24dd64', 'c49bdabf-f294-4feb-91d5-c7b1b42e9530', 80, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('d46d04f9-c43b-43d9-b4fa-6b749d447375', 'd112af06-15d1-4258-a59b-517141e41bc3', 45, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('6a308ba7-6541-445d-b974-69befb6c12c6', '391c2efb-dfaa-4d3e-aa1e-bfc9020cb058', 60, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('b877e3f6-6880-4f18-adba-0c803c24dd64', '595a2b13-71df-4ecf-8d72-c49a61f3d6a0', 120, 10);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('d46d04f9-c43b-43d9-b4fa-6b749d447375', 'a9a1dd61-4f02-45ac-96e2-91bb95721aa0', 35, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('6a308ba7-6541-445d-b974-69befb6c12c6', '4d42050d-6ade-4ff6-b017-95b7898c61e5', 90, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('b877e3f6-6880-4f18-adba-0c803c24dd64', '0cec6bee-24c6-46c0-92e5-23b706b1fa68', 75, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('d46d04f9-c43b-43d9-b4fa-6b749d447375', 'f0e90328-290a-4141-bcff-8f9d0d75a4b1', 40, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('6a308ba7-6541-445d-b974-69befb6c12c6', '4a07c9e1-94ca-45bc-a303-9d1c499d4611', 55, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('b877e3f6-6880-4f18-adba-0c803c24dd64', '7810bf6e-4cf2-400c-8a72-19e02e5719c1', 50, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('d46d04f9-c43b-43d9-b4fa-6b749d447375', '2da487d2-d8ec-4573-9429-137c38648e07', 65, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('6a308ba7-6541-445d-b974-69befb6c12c6', 'ce9f279e-0777-484a-a2d2-352ec9880968', 48, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('b877e3f6-6880-4f18-adba-0c803c24dd64', '5b196535-2e39-48b0-95e7-a33f6d014c99', 88, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('d46d04f9-c43b-43d9-b4fa-6b749d447375', 'e90f2d3f-6548-418a-9270-08f8cb04ab29', 62, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('6a308ba7-6541-445d-b974-69befb6c12c6', '4a8a605b-9509-464f-8d75-35e4ec11140d', 22, 10);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('50c5d41a-10e8-44ff-aa44-7300b57e9b24', 'c49bdabf-f294-4feb-91d5-c7b1b42e9530', 80, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('e8a773b8-68db-4a17-bce1-2ef9c254c177', 'd112af06-15d1-4258-a59b-517141e41bc3', 45, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('ef59d332-cae2-4310-83c1-9737a68b8dfb', '391c2efb-dfaa-4d3e-aa1e-bfc9020cb058', 60, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('50c5d41a-10e8-44ff-aa44-7300b57e9b24', '595a2b13-71df-4ecf-8d72-c49a61f3d6a0', 120, 10);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('e8a773b8-68db-4a17-bce1-2ef9c254c177', 'a9a1dd61-4f02-45ac-96e2-91bb95721aa0', 35, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('ef59d332-cae2-4310-83c1-9737a68b8dfb', '4d42050d-6ade-4ff6-b017-95b7898c61e5', 90, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('50c5d41a-10e8-44ff-aa44-7300b57e9b24', '0cec6bee-24c6-46c0-92e5-23b706b1fa68', 75, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('e8a773b8-68db-4a17-bce1-2ef9c254c177', 'f0e90328-290a-4141-bcff-8f9d0d75a4b1', 40, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('ef59d332-cae2-4310-83c1-9737a68b8dfb', '4a07c9e1-94ca-45bc-a303-9d1c499d4611', 55, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('50c5d41a-10e8-44ff-aa44-7300b57e9b24', '7810bf6e-4cf2-400c-8a72-19e02e5719c1', 50, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('e8a773b8-68db-4a17-bce1-2ef9c254c177', '2da487d2-d8ec-4573-9429-137c38648e07', 65, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('ef59d332-cae2-4310-83c1-9737a68b8dfb', 'ce9f279e-0777-484a-a2d2-352ec9880968', 48, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('50c5d41a-10e8-44ff-aa44-7300b57e9b24', '5b196535-2e39-48b0-95e7-a33f6d014c99', 88, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('e8a773b8-68db-4a17-bce1-2ef9c254c177', 'e90f2d3f-6548-418a-9270-08f8cb04ab29', 62, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('ef59d332-cae2-4310-83c1-9737a68b8dfb', '4a8a605b-9509-464f-8d75-35e4ec11140d', 22, 10);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('a28c33e3-b54b-47f1-86d1-d03dadde006d', 'c49bdabf-f294-4feb-91d5-c7b1b42e9530', 80, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('94206cfa-9047-4d48-888b-ec2f5cea6a9b', 'd112af06-15d1-4258-a59b-517141e41bc3', 45, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('83de4fb8-be1a-4b5e-9445-47eeec35f251', '391c2efb-dfaa-4d3e-aa1e-bfc9020cb058', 60, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('a28c33e3-b54b-47f1-86d1-d03dadde006d', '595a2b13-71df-4ecf-8d72-c49a61f3d6a0', 120, 10);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('94206cfa-9047-4d48-888b-ec2f5cea6a9b', 'a9a1dd61-4f02-45ac-96e2-91bb95721aa0', 35, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('83de4fb8-be1a-4b5e-9445-47eeec35f251', '4d42050d-6ade-4ff6-b017-95b7898c61e5', 90, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('a28c33e3-b54b-47f1-86d1-d03dadde006d', '0cec6bee-24c6-46c0-92e5-23b706b1fa68', 75, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('94206cfa-9047-4d48-888b-ec2f5cea6a9b', 'f0e90328-290a-4141-bcff-8f9d0d75a4b1', 40, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('83de4fb8-be1a-4b5e-9445-47eeec35f251', '4a07c9e1-94ca-45bc-a303-9d1c499d4611', 55, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('a28c33e3-b54b-47f1-86d1-d03dadde006d', '7810bf6e-4cf2-400c-8a72-19e02e5719c1', 50, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('94206cfa-9047-4d48-888b-ec2f5cea6a9b', '2da487d2-d8ec-4573-9429-137c38648e07', 65, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('83de4fb8-be1a-4b5e-9445-47eeec35f251', 'ce9f279e-0777-484a-a2d2-352ec9880968', 48, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('a28c33e3-b54b-47f1-86d1-d03dadde006d', '5b196535-2e39-48b0-95e7-a33f6d014c99', 88, 20);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('94206cfa-9047-4d48-888b-ec2f5cea6a9b', 'e90f2d3f-6548-418a-9270-08f8cb04ab29', 62, 15);
INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct) VALUES ('83de4fb8-be1a-4b5e-9445-47eeec35f251', '4a8a605b-9509-464f-8d75-35e4ec11140d', 22, 10);
