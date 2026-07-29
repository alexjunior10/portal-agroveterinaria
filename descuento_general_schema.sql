-- =========================================================
-- MÓDULO DE DESCUENTO GENERAL - CAJA LOS ANDES MVP
-- =========================================================

-- 1. ACTUALIZAR AGROVETERINARIAS
ALTER TABLE public.agroveterinarias 
ADD COLUMN IF NOT EXISTS descuento_convenio_pct DECIMAL(5,2) DEFAULT 20.00;

-- Setear porcentajes de prueba solicitados
UPDATE public.agroveterinarias SET descuento_convenio_pct = 20.00 WHERE nombre = 'Veterinaria San Isidro';
UPDATE public.agroveterinarias SET descuento_convenio_pct = 15.00 WHERE nombre LIKE 'AgroVet Asillo%';
UPDATE public.agroveterinarias SET descuento_convenio_pct = 10.00 WHERE nombre = 'Campo Salud Animal';

-- 2. ACTUALIZAR CANJES
-- Hacemos opcionales las columnas antiguas para no eliminarlas físicamente
ALTER TABLE public.canjes ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE public.canjes ALTER COLUMN cantidad DROP NOT NULL;
ALTER TABLE public.canjes ALTER COLUMN precio DROP NOT NULL;

-- Agregamos las nuevas columnas operativas
ALTER TABLE public.canjes ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2);
ALTER TABLE public.canjes ADD COLUMN IF NOT EXISTS usuario_atencion VARCHAR(255);

-- 3. NUEVA FUNCIÓN RPC PARA EL REGISTRO
CREATE OR REPLACE FUNCTION public.registrar_beneficio_v3(
    p_cliente_dni VARCHAR,
    p_agroveterinaria_id UUID,
    p_subtotal DECIMAL,
    p_descuento_pct DECIMAL,
    p_monto_descontado DECIMAL,
    p_total_pagado DECIMAL,
    p_usuario_atencion VARCHAR
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existe_canje UUID;
BEGIN
    -- Validar si el cliente ya utilizó el beneficio de descuento general
    SELECT id INTO v_existe_canje FROM public.canjes WHERE cliente_dni = p_cliente_dni;
    
    IF v_existe_canje IS NOT NULL THEN
        RAISE EXCEPTION 'El beneficio ya ha sido utilizado por este cliente.';
    END IF;

    -- Insertar el canje usando el nuevo modelo de datos (sin producto_id)
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
        p_subtotal,
        p_descuento_pct,
        p_monto_descontado,
        p_total_pagado,
        p_usuario_atencion
    );
END;
$$;

-- 4. RECARGAR SCHEMA CACHE DE SUPABASE
NOTIFY pgrst, 'reload schema';
