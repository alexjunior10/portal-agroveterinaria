# Caja Los Andes - MVP Gestión de Beneficios en Agroveterinarias

Este proyecto es un Prototipo Funcional (MVP) diseñado para validar el flujo de negocio del nuevo beneficio para clientes agropecuarios de Caja Los Andes.

## Tecnologías Utilizadas

- **Frontend:** React, TypeScript, Vite
- **Estilos:** Tailwind CSS (con paleta de colores institucional)
- **Rutas:** React Router DOM
- **Backend/Base de datos:** Supabase (PostgreSQL)

## Estructura del Proyecto

El proyecto se divide en dos módulos principales:

1. **Portal Agroveterinaria (`/veterinaria`)**: Interfaz rápida para que los veterinarios busquen clientes por DNI, verifiquen su estado y registren el canje del beneficio en menos de 20 segundos.
2. **Portal Administrador (`/admin`)**: Panel de control para que el equipo de Caja Los Andes visualice los indicadores (KPIs), exporte registros y administre el catálogo de productos.

## Instrucciones de Instalación Local

### 1. Preparar la Base de Datos (Supabase)

1. Crea un nuevo proyecto en [Supabase](https://supabase.com/).
2. Ve al **SQL Editor** y ejecuta todo el contenido del archivo `schema_and_seed.sql` que se encuentra en la raíz de este proyecto. Este script:
   - Crea las tablas `clientes`, `productos` y `usos_beneficio`.
   - Crea la función RPC `registrar_beneficio` para prevenir canjes duplicados (concurrencia).
   - Inserta datos ficticios (20 clientes, 5 productos).
   - Configura políticas RLS (Row Level Security) abiertas para facilitar la validación del MVP.

### 2. Configurar Variables de Entorno

1. Copia el archivo `.env.example` y renómbralo a `.env`.
2. En Supabase, ve a *Project Settings -> API* y copia la **URL** y la **anon key**.
3. Pega esos valores en el archivo `.env`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar y Ejecutar

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## Instrucciones para Despliegue en Vercel

1. Sube el código a un repositorio de GitHub (asegúrate de que el archivo `.env` esté en tu `.gitignore`).
2. Inicia sesión en [Vercel](https://vercel.com/) y haz clic en **Add New -> Project**.
3. Importa tu repositorio de GitHub.
4. En el paso de configuración, expande la sección **Environment Variables**.
5. Agrega las dos variables de tu proyecto de Supabase (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`).
6. Haz clic en **Deploy**.

¡Y listo! Vercel detectará automáticamente que es un proyecto Vite y lo construirá correctamente.

## Notas sobre Seguridad y Producción

> [!WARNING]  
> Este proyecto es un MVP validatorio. Actualmente el panel de administración no cuenta con sistema de autenticación (Login) y las políticas RLS de Supabase están configuradas en modo público.  
> **Antes de lanzar el producto real a producción**, se debe integrar autenticación (ej. Supabase Auth) y restringir el acceso a la base de datos únicamente a usuarios autorizados.
