-- =========================================================
-- DESPLIEGUE FINAL MULTILÍNEA - CAJA LOS ANDES MVP
-- =========================================================

-- 1. CREAR TABLA DE DETALLES
-- Esta tabla guardará cada producto por separado de una transacción
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

-- 2. NUEVA FUNCIÓN RPC PARA REGISTRO MULTILÍNEA
-- Recibe un JSON de detalles y procesa cabecera y líneas en una sola transacción
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
    -- Validar si el cliente ya utilizó el beneficio multilínea (donde producto_id de la cabecera es nulo)
    SELECT id INTO v_existe_canje FROM public.canjes 
    WHERE cliente_dni = p_cliente_dni AND producto_id IS NULL;
    
    IF v_existe_canje IS NOT NULL THEN
        RAISE EXCEPTION 'El beneficio ya ha sido utilizado por este cliente bajo el nuevo esquema multilínea.';
    END IF;

    -- 1. Insertar la cabecera
    INSERT INTO public.canjes (
        cliente_dni,
        agroveterinaria_id,
        subtotal,
        descuento_pct,
        monto_descontado,
        total_pagado,
        usuario_atencion,
        producto_id
    ) VALUES (
        p_cliente_dni,
        p_agroveterinaria_id,
        p_subtotal_total,
        0, -- Ya no usamos descuento global, dejamos 0
        p_descuento_total,
        p_total_neto,
        p_usuario_atencion,
        NULL
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

-- 3. RECARGAR SCHEMA CACHE DE SUPABASE
NOTIFY pgrst, 'reload schema';
