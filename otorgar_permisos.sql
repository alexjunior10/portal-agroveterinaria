-- =========================================================
-- OTORGAR PERMISOS A LA TABLA DE DETALLES
-- =========================================================

-- Permite que la aplicación frontend pueda leer la tabla canje_detalles
GRANT SELECT ON TABLE public.canje_detalles TO anon, authenticated;

-- (Opcional, por precaución) Recargar el caché de Supabase
NOTIFY pgrst, 'reload schema';
