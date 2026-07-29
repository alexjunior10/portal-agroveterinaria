-- =========================================================
-- POBLAR PRODUCTOS POR CONVENIO - PILOTO CAJA LOS ANDES
-- =========================================================

-- 1. Limpiar los convenios actuales para asegurar una asignación en blanco
DELETE FROM public.agroveterinaria_productos;

-- 2. Asignar 4 productos aleatorios a cada agroveterinaria con descuentos estándar (5%, 10%, 15%, 20%)
DO $$
DECLARE
    v_agro record;
    v_prod record;
    v_descuento DECIMAL;
    v_descuentos_posibles DECIMAL[] := ARRAY[5.00, 10.00, 15.00, 20.00];
BEGIN
    -- Recorremos todas las agroveterinarias existentes
    FOR v_agro IN SELECT id FROM public.agroveterinarias LOOP
        
        -- Seleccionamos 4 productos aleatorios distintos de la tabla de productos general
        FOR v_prod IN (SELECT id FROM public.productos ORDER BY random() LIMIT 4) LOOP
            
            -- Seleccionamos un porcentaje aleatorio del arreglo de valores comerciales
            v_descuento := v_descuentos_posibles[floor(random() * array_length(v_descuentos_posibles, 1) + 1)];
            
            -- Insertamos la relación en el catálogo del convenio
            -- El campo precio_venta se mantiene en 0 ya que no se utiliza operativamente,
            -- pero se envía por compatibilidad de la base de datos si tiene restricción NOT NULL.
            INSERT INTO public.agroveterinaria_productos (
                agroveterinaria_id, 
                producto_id, 
                descuento_pct, 
                estado, 
                precio_venta
            ) VALUES (
                v_agro.id, 
                v_prod.id, 
                v_descuento, 
                'Activo', 
                0
            ) ON CONFLICT DO NOTHING; -- Por precaución
            
        END LOOP;
        
    END LOOP;
END;
$$;

-- 3. Notificar a Supabase para limpiar el caché
NOTIFY pgrst, 'reload schema';
