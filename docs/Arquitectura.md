# Arquitectura del Sistema

El Portal Agroveterinaria es un MVP construido sobre una arquitectura Frontend-as-a-Service, priorizando la agilidad, seguridad y el diseño centrado en el usuario.

## Stack Tecnológico
- **Frontend**: React 18, Vite.
- **Enrutamiento**: React Router v6.
- **Estilos**: TailwindCSS.
- **Iconografía**: Lucide React.
- **Backend / Base de Datos**: Supabase (PostgreSQL).
- **Autenticación**: Supabase Auth (Email / Password).
- **Notificaciones**: react-hot-toast.
- **Generación de Reportes**: exceljs, file-saver.

## Módulos Principales
La aplicación está dividida lógicamente en dos áreas protegidas mediante RLS y Protected Routes de React:

1. **Portal Administrador (`/admin`)**
   - Dashboard de Beneficios por Productos.
   - Dashboard de Servicios Veterinarios.
   - Gestión de Catálogo de Productos y Convenios.
   - Configuración de Servicios y Tarifas.
   - Seguimiento del Programa de Referidos (Generación de Excels).

2. **Portal Agroveterinaria (`/veterinaria`)**
   - Canje de Beneficios de Productos.
   - Registro de Servicios Veterinarios.
   - Registro y Derivación de Nuevos Clientes (Referidos).

## Flujo de Datos y Conexión
La aplicación interactúa con Supabase mediante el cliente `@supabase/supabase-js`. 
Todo el acceso a datos es directo a Supabase, aprovechando Row Level Security (RLS) para proteger que cada usuario solo vea o interactúe con los datos de su propia sede (o con todo, si es administrador).
