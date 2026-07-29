-- =========================================================
-- MÓDULO DE DESCUENTO GENERAL MULTILÍNEA - CAJA LOS ANDES MVP
-- =========================================================

-- 1. ACTUALIZAR AGROVETERINARIA_PRODUCTOS
-- Agregamos un ID subrogado único para poder referenciarlo de forma sencilla
ALTER TABLE public.agroveterinaria_productos ADD COLUMN IF NOT EXISTS id UUID UNIQUE DEFAULT public.uuid_generate_v4();
-- Agregamos el estado
ALTER TABLE public.agroveterinaria_productos ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'Activo';

-- Borrar datos de prueba antiguos para insertar los nuevos del rubro agropecuario
DELETE FROM public.agroveterinaria_productos;
DELETE FROM public.productos;

-- Insertar los nuevos productos
INSERT INTO public.productos (id, nombre) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Vitaminas'),
    ('22222222-2222-2222-2222-222222222222', 'Vacunas'),
    ('33333333-3333-3333-3333-333333333333', 'Antiparasitarios'),
    ('44444444-4444-4444-4444-444444444444', 'Alimento Balanceado'),
    ('55555555-5555-5555-5555-555555555555', 'Sales Minerales'),
    ('66666666-6666-6666-6666-666666666666', 'Antibióticos')
ON CONFLICT (nombre) DO NOTHING;

-- Insertar asociaciones de productos a las agroveterinarias
DO $$
DECLARE
    v_agro record;
BEGIN
    FOR v_agro IN SELECT id FROM public.agroveterinarias LOOP
        INSERT INTO public.agroveterinaria_productos (agroveterinaria_id, producto_id, precio_venta, descuento_pct, estado) VALUES
            (v_agro.id, (SELECT id FROM public.productos WHERE nombre = 'Vitaminas'), 0, 20.00, 'Activo'),
            (v_agro.id, (SELECT id FROM public.productos WHERE nombre = 'Vacunas'), 0, 10.00, 'Activo'),
            (v_agro.id, (SELECT id FROM public.productos WHERE nombre = 'Antiparasitarios'), 0, 15.00, 'Activo'),
            (v_agro.id, (SELECT id FROM public.productos WHERE nombre = 'Alimento Balanceado'), 0, 5.00, 'Activo'),
            (v_agro.id, (SELECT id FROM public.productos WHERE nombre = 'Sales Minerales'), 0, 15.00, 'Activo');
    END LOOP;
END;
$$;

-- 2. CREAR TABLA DE DETALLES
CREATE TABLE IF NOT EXISTS public.canje_detalles (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    canje_id UUID NOT NULL REFERENCES public.canjes(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
    producto_nombre VARCHAR(255) NOT NULL,
    descuento_pct DECIMAL(5,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    monto_descontado DECIMAL(10,2) NOT NULL,
    total_neto DECIMAL(10,2) NOT NULL
);

-- 3. NUEVA FUNCIÓN RPC PARA REGISTRO MULTILÍNEA
-- Recibe un JSON de detalles: [{"producto_id": "uuid", "producto_nombre": "str", "descuento_pct": 10, "subtotal": 100, "monto_descontado": 10, "total_neto": 90}]
CREATE OR REPLACE FUNCTION public.registrar_beneficio_v4(
    p_cliente_dni VARCHAR,
    p_agroveterinaria_id UUID,
    p_subtotal_total DECIMAL,
    p_descuento_total DECIMAL,
    p_total_neto DECIMAL,
    p_usuario_atencion VARCHAR,
    p_detalles JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existe_canje UUID;
    v_nuevo_canje_id UUID;
    v_detalle JSONB;
BEGIN
    -- Validar si el cliente ya utilizó el beneficio
    SELECT id INTO v_existe_canje FROM public.canjes WHERE cliente_dni = p_cliente_dni;
    
    IF v_existe_canje IS NOT NULL THEN
        RAISE EXCEPTION 'El beneficio ya ha sido utilizado por este cliente.';
    END IF;

    -- 1. Insertar la cabecera
    INSERT INTO public.canjes (
        cliente_dni,
        agroveterinaria_id,
        subtotal,
        descuento_pct,
        monto_descontado,
        total_pagado,
        usuario_atencion
    ) VALUES (
        p_cliente_dni,
        p_agroveterinaria_id,
        p_subtotal_total,
        0, -- Ya no usamos descuento global, dejamos 0
        p_descuento_total,
        p_total_neto,
        p_usuario_atencion
    ) RETURNING id INTO v_nuevo_canje_id;

    -- 2. Insertar los detalles
    FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
    LOOP
        INSERT INTO public.canje_detalles (
            canje_id,
            producto_id,
            producto_nombre,
            descuento_pct,
            subtotal,
            monto_descontado,
            total_neto
        ) VALUES (
            v_nuevo_canje_id,
            (v_detalle->>'producto_id')::UUID,
            v_detalle->>'producto_nombre',
            (v_detalle->>'descuento_pct')::DECIMAL,
            (v_detalle->>'subtotal')::DECIMAL,
            (v_detalle->>'monto_descontado')::DECIMAL,
            (v_detalle->>'total_neto')::DECIMAL
        );
    END LOOP;
END;
$$;

-- 4. RECARGAR SCHEMA CACHE DE SUPABASE
NOTIFY pgrst, 'reload schema';
