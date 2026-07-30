-- MÓDULO DE AUTENTICACIÓN Y ROLES

-- 1. Crear tabla de roles de usuarios
CREATE TABLE IF NOT EXISTS public.usuarios_roles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL CHECK (rol IN ('ADMIN', 'AGROVET')),
    agroveterinaria_id UUID REFERENCES public.agroveterinarias(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS (Row Level Security)
ALTER TABLE public.usuarios_roles ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para que el usuario pueda ver su propio rol
DROP POLICY IF EXISTS "Usuarios pueden ver su propio rol" ON public.usuarios_roles;
CREATE POLICY "Usuarios pueden ver su propio rol" 
ON public.usuarios_roles 
FOR SELECT 
USING (auth.uid() = id);

-- NOTA:
-- Como requerimiento del MVP, los usuarios y roles se gestionarán manualmente.
-- Para configurar el MVP:
-- 1. Ve a Supabase -> Authentication -> Users -> "Add User"
-- 2. Crea el usuario `admin@demo.com` con Password `Admin123!`
-- 3. Crea el usuario `vet@demo.com` con Password `Vet123!`
-- 4. Copia los UUID generados para cada uno.
-- 5. Ve al SQL Editor y ejecuta algo como:
/*
  INSERT INTO public.usuarios_roles (id, email, rol, agroveterinaria_id)
  VALUES 
  ('UUID_DEL_ADMIN', 'admin@demo.com', 'ADMIN', NULL),
  ('UUID_DEL_VET', 'vet@demo.com', 'AGROVET', 'UUID_DE_UNA_AGROVETERINARIA');
*/
