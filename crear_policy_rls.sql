-- =========================================================
-- HABILITAR LECTURA DE CANJE_DETALLES (RLS POLICY)
-- =========================================================

-- Asegurarnos de que RLS esté activado (aunque ya lo confirmaste, es buena práctica)
ALTER TABLE public.canje_detalles ENABLE ROW LEVEL SECURITY;

-- Crear política que permite a cualquier usuario (incluyendo anon) leer los registros
CREATE POLICY "Permitir lectura publica de canje_detalles" 
ON public.canje_detalles 
FOR SELECT 
USING (true);
