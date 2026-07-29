-- ==========================================
-- CAJA LOS ANDES - MVP AGROVETERINARIAS
-- Esquema y Datos de Prueba
-- ==========================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLAS

-- Tabla de Clientes
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dni VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    corredor VARCHAR(255) NOT NULL,
    beneficio VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('disponible', 'utilizado')) DEFAULT 'disponible',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Productos
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    precio_referencial DECIMAL(10,2) NOT NULL,
    descuento DECIMAL(5,2) NOT NULL, -- Porcentaje (ej. 20.00)
    estado VARCHAR(50) NOT NULL CHECK (estado IN ('activo', 'inactivo')) DEFAULT 'activo',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Usos de Beneficio
CREATE TABLE public.usos_beneficio (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE UNIQUE, -- UNIQUE para MVP, previene doble canje
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    veterinario VARCHAR(255) NOT NULL,
    agroveterinaria VARCHAR(255) NOT NULL,
    precio_producto DECIMAL(10,2) NOT NULL,
    porcentaje_descuento DECIMAL(5,2) NOT NULL,
    monto_descontado DECIMAL(10,2) NOT NULL,
    observacion TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNCIONES (Para el manejo seguro de concurrencia al registrar)
-- Esta función registra el uso y marca el cliente como 'utilizado' en una sola transacción.
CREATE OR REPLACE FUNCTION registrar_beneficio(
    p_cliente_id UUID,
    p_producto_id UUID,
    p_veterinario VARCHAR,
    p_agroveterinaria VARCHAR,
    p_precio_producto DECIMAL,
    p_porcentaje_descuento DECIMAL,
    p_monto_descontado DECIMAL,
    p_observacion TEXT
) RETURNS JSON AS $$
DECLARE
    v_estado_cliente VARCHAR;
    v_uso_id UUID;
BEGIN
    -- Verificar si el beneficio está disponible bloqueando la fila
    SELECT estado INTO v_estado_cliente FROM public.clientes WHERE id = p_cliente_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente no encontrado';
    END IF;

    IF v_estado_cliente = 'utilizado' THEN
        RAISE EXCEPTION 'El beneficio ya fue utilizado por este cliente';
    END IF;

    -- Insertar el uso del beneficio
    INSERT INTO public.usos_beneficio (
        cliente_id, producto_id, veterinario, agroveterinaria, 
        precio_producto, porcentaje_descuento, monto_descontado, observacion
    ) VALUES (
        p_cliente_id, p_producto_id, p_veterinario, p_agroveterinaria,
        p_precio_producto, p_porcentaje_descuento, p_monto_descontado, p_observacion
    ) RETURNING id INTO v_uso_id;

    -- Actualizar estado del cliente
    UPDATE public.clientes SET estado = 'utilizado' WHERE id = p_cliente_id;

    RETURN json_build_object('success', true, 'uso_id', v_uso_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. DATOS DE PRUEBA (SEED)

-- Insertar 5 Productos
INSERT INTO public.productos (id, nombre, categoria, precio_referencial, descuento, estado) VALUES
('p1000000-0000-0000-0000-000000000001', 'Antiparasitario Bovino Premium', 'Salud Animal', 80.00, 20.00, 'activo'),
('p1000000-0000-0000-0000-000000000002', 'Vacuna Reproductiva 10 Dosis', 'Vacunas', 150.00, 15.00, 'activo'),
('p1000000-0000-0000-0000-000000000003', 'Suplemento Mineral Lechero 25kg', 'Nutrición', 120.00, 10.00, 'activo'),
('p1000000-0000-0000-0000-000000000004', 'Antibiótico de Amplio Espectro 100ml', 'Farmacología', 65.00, 25.00, 'activo'),
('p1000000-0000-0000-0000-000000000005', 'Cicatrizante en Spray 200ml', 'Cuidado Tópico', 30.00, 10.00, 'activo');

-- Insertar 20 Clientes
INSERT INTO public.clientes (id, dni, nombre, corredor, beneficio, estado) VALUES
('c1000000-0000-0000-0000-000000000001', '12345678', 'Juan Pérez Gómez', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000002', '23456789', 'María Rodríguez Silva', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000003', '34567890', 'Carlos Soto Vargas', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000004', '45678901', 'Ana Castillo Rojas', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000005', '56789012', 'Luis Morales Pinto', 'Corredor Sur', 'Descuento General Agroveterinaria', 'utilizado'),
('c1000000-0000-0000-0000-000000000006', '67890123', 'Carmen Torres Luna', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000007', '78901234', 'Jorge Valdés Mora', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000008', '89012345', 'Marta Herrera Salas', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000009', '90123456', 'Pedro Castro Ríos', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000010', '01234567', 'Lucía Vega Marín', 'Corredor Norte', 'Descuento General Agroveterinaria', 'utilizado'),
('c1000000-0000-0000-0000-000000000011', '11223344', 'Roberto Núñez Parra', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000012', '22334455', 'Elena Ruiz Cruz', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000013', '33445566', 'Miguel Díaz Pizarro', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000014', '44556677', 'Teresa Salinas León', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000015', '55667788', 'Fernando Peña Moya', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000016', '66778899', 'Rosa Cárdenas Vera', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000017', '77889900', 'Hugo Carrasco Fuentes', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000018', '88990011', 'Silvia Reyes Campos', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000019', '99001122', 'Raúl Muñoz Soto', 'Corredor Sur', 'Descuento General Agroveterinaria', 'disponible'),
('c1000000-0000-0000-0000-000000000020', '00112233', 'Gloria Fernández Rivas', 'Corredor Norte', 'Descuento General Agroveterinaria', 'disponible');

-- Insertar Usos de Beneficio para los clientes que ya lo utilizaron (ID 5 y 10)
INSERT INTO public.usos_beneficio (cliente_id, producto_id, veterinario, agroveterinaria, precio_producto, porcentaje_descuento, monto_descontado, observacion, fecha_registro) VALUES
('c1000000-0000-0000-0000-000000000005', 'p1000000-0000-0000-0000-000000000001', 'Dr. Alberto Gómez', 'AgroVet Sur', 80.00, 20.00, 16.00, 'Sin novedad', NOW() - INTERVAL '2 days'),
('c1000000-0000-0000-0000-000000000010', 'p1000000-0000-0000-0000-000000000002', 'Dra. Laura Jiménez', 'Veterinaria El Campo', 150.00, 15.00, 22.50, '', NOW() - INTERVAL '5 days');

-- 5. POLÍTICAS DE SEGURIDAD (RLS) - ABIERTAS PARA EL MVP
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usos_beneficio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Allow public read access for productos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Allow public read access for usos_beneficio" ON public.usos_beneficio FOR SELECT USING (true);

-- Permitir inserts y updates de forma pública temporalmente por el MVP
CREATE POLICY "Allow public update access for clientes" ON public.clientes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public insert access for usos_beneficio" ON public.usos_beneficio FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert access for productos" ON public.productos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for productos" ON public.productos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access for productos" ON public.productos FOR DELETE USING (true);
