-- =========================================================
-- MIGRACIÓN DEFINITIVA Y CONSISTENTE: MODELO MULTILÍNEA
-- =========================================================

-- 1. ADAPTAR LA TABLA CANJES (CABECERA)
-- Hacemos opcionales las columnas del modelo antiguo para soportar registros históricos y los nuevos registros multilínea
ALTER TABLE public.canjes ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE public.canjes ALTER COLUMN precio DROP NOT NULL;

-- Verificamos si existe la columna cantidad antes de alterarla (por precaución)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='canjes' AND column_name='cantidad') THEN
    ALTER TABLE public.canjes ALTER COLUMN cantidad DROP NOT NULL;
  END IF;
END $$;

-- Añadimos las nuevas columnas necesarias para el modelo multilínea
ALTER TABLE public.canjes ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE public.canjes ADD COLUMN IF NOT EXISTS usuario_atencion VARCHAR(255);

-- 2. CREAR TABLA DE DETALLES
-- Esta tabla guardará cada producto por separado para los nuevos canjes multilínea
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

-- 3. FUNCIÓN RPC PARA REGISTRO MULTILÍNEA
-- Procesa cabecera y líneas en una sola transacción segura
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
    -- Validar si el cliente ya utilizó el beneficio multilínea (donde producto_id es nulo)
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

-- 4. RECARGAR SCHEMA CACHE DE SUPABASE
NOTIFY pgrst, 'reload schema';
