-- MÓDULO DE REFERIDOS
CREATE TABLE IF NOT EXISTS public.referidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    agroveterinaria_id UUID NOT NULL REFERENCES public.agroveterinarias(id) ON DELETE RESTRICT,
    
    -- Datos del referido (Persona Recomendada / Nuevo Cliente)
    referido_dni VARCHAR(20) NOT NULL,
    referido_nombre VARCHAR(255),
    referido_celular VARCHAR(20),
    referido_distrito VARCHAR(100),
    referido_localidad VARCHAR(100),
    monto_aproximado NUMERIC(10,2) NOT NULL,
    
    -- Seguimiento
    estado VARCHAR(50) DEFAULT 'Pendiente de envío', -- Estados: Pendiente de envío, Enviado, En evaluación, Desembolsado, No aprobado
    fecha_desembolso TIMESTAMPTZ,
    monto_desembolsado NUMERIC(10,2),
    observaciones TEXT
);

-- Habilitar RLS
ALTER TABLE public.referidos ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
CREATE POLICY "Allow public read access referidos" ON public.referidos FOR SELECT USING (true);
CREATE POLICY "Allow public insert referidos" ON public.referidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update referidos" ON public.referidos FOR UPDATE USING (true);
CREATE POLICY "Allow public delete referidos" ON public.referidos FOR DELETE USING (true);

-- Refrescar caché PostgREST
NOTIFY pgrst, 'reload schema';
