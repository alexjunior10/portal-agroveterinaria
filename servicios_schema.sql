-- =========================================================
-- MÓDULO DE SERVICIOS - CAJA LOS ANDES MVP
-- =========================================================

-- 1. TABLAS BASE
CREATE TABLE IF NOT EXISTS public.servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS public.agroveterinaria_servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agroveterinaria_id UUID NOT NULL REFERENCES public.agroveterinarias(id) ON DELETE CASCADE,
    servicio_id UUID NOT NULL REFERENCES public.servicios(id) ON DELETE CASCADE,
    cupo_total INTEGER NOT NULL,
    estado VARCHAR(50) DEFAULT 'Activo',
    UNIQUE(agroveterinaria_id, servicio_id)
);

CREATE TABLE IF NOT EXISTS public.cliente_servicios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_dni VARCHAR(20) NOT NULL REFERENCES public.clientes(dni) ON DELETE RESTRICT,
    agro_servicio_id UUID NOT NULL REFERENCES public.agroveterinaria_servicios(id) ON DELETE RESTRICT,
    estado VARCHAR(50) DEFAULT 'Pendiente', -- 'Pendiente' o 'Utilizado'
    fecha_asignacion TIMESTAMPTZ DEFAULT NOW(),
    usuario_asignacion VARCHAR(255),
    fecha_utilizacion TIMESTAMPTZ,
    usuario_atencion VARCHAR(255),
    UNIQUE(cliente_dni, agro_servicio_id) -- Un cliente no puede tener el mismo servicio en la misma sucursal dos veces al mismo tiempo
);

-- 2. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agroveterinaria_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.servicios FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.agroveterinaria_servicios FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON public.cliente_servicios FOR SELECT USING (true);

-- Permisos para modificar e insertar desde el front
CREATE POLICY "Allow public insert" ON public.cliente_servicios FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.cliente_servicios FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.cliente_servicios FOR DELETE USING (true);

-- 3. SEMBRAR DATOS (SEED)
-- Servicios Base
INSERT INTO public.servicios (nombre) VALUES ('Diagnóstico Veterinario'), ('Visita Veterinaria')
ON CONFLICT (nombre) DO NOTHING;

-- Configuracion de Cupos basados en el Excel
DO $$
DECLARE
    v_diag_id UUID;
    v_visita_id UUID;
    v_agro_id UUID;
    v_agro_nombre VARCHAR;
BEGIN
    SELECT id INTO v_diag_id FROM public.servicios WHERE nombre = 'Diagnóstico Veterinario';
    SELECT id INTO v_visita_id FROM public.servicios WHERE nombre = 'Visita Veterinaria';

    FOR v_agro_nombre IN (
        SELECT unnest(ARRAY[
            'Veterinaria San Isidro', 'AgroVet Asillo Centro', 'Campo Salud Animal',
            'AgroVet Azángaro', 'Campo Animal Ayaviri', 'Campo Animal Chupaca',
            'Veterinaria Valle Verde', 'AgroVet Chupaca', 'AgroVet Ayaviri',
            'Veterinaria Melgar', 'Veterinaria Altiplano', 'Agro Rural Azángaro'
        ])
    ) LOOP
        SELECT id INTO v_agro_id FROM public.agroveterinarias WHERE nombre = v_agro_nombre;
        
        IF v_agro_id IS NOT NULL THEN
            -- Diagnostico Veterinario (Cupo 10)
            INSERT INTO public.agroveterinaria_servicios (agroveterinaria_id, servicio_id, cupo_total, estado)
            VALUES (v_agro_id, v_diag_id, 10, 'Activo')
            ON CONFLICT (agroveterinaria_id, servicio_id) DO NOTHING;

            -- Visita Veterinaria (Cupo 5)
            INSERT INTO public.agroveterinaria_servicios (agroveterinaria_id, servicio_id, cupo_total, estado)
            VALUES (v_agro_id, v_visita_id, 5, 'Activo')
            ON CONFLICT (agroveterinaria_id, servicio_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- Refrescar cache PostgREST por si acaso
NOTIFY pgrst, 'reload schema';
