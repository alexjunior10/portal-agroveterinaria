# Guía de Despliegue en Vercel

El MVP del Portal Agroveterinaria está preparado para ser desplegado fácilmente usando Vercel. Sigue estos pasos para llevar la aplicación a producción.

## 1. Requisitos Previos
- Cuenta en [Vercel](https://vercel.com).
- Repositorio del proyecto subido a GitHub, GitLab o Bitbucket.
- Proyecto de Supabase ya configurado (Base de datos, políticas RLS, Auth).

## 2. Variables de Entorno
En el dashboard de tu proyecto en Vercel (Sección **Settings > Environment Variables**), debes configurar las siguientes variables, las cuales sacarás de tu dashboard de Supabase (Settings > API):

- `VITE_SUPABASE_URL`: (Ej. `https://xxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: (Tu clave pública anónima de Supabase)

## 3. Configuración del Proyecto en Vercel
1. Ve a **Add New... > Project** en Vercel.
2. Importa tu repositorio.
3. Vercel detectará automáticamente que es un proyecto **Vite** (Framework Preset).
4. El comando de build por defecto (`npm run build`) y el directorio de salida (`dist`) son correctos.
5. Pega tus variables de entorno en el paso correspondiente.
6. Haz clic en **Deploy**.

## 4. Archivo `vercel.json`
El proyecto ya cuenta con un archivo `vercel.json` en la raíz. Este archivo es **crítico** para las aplicaciones SPA (Single Page Applications) como React Router. Contiene la regla:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Esta regla evita que Vercel devuelva un error 404 (Not Found) cuando un usuario recarga manualmente una ruta como `/admin` o `/login`. Toda petición se redirige al `index.html` y React Router toma el control del enrutamiento interno.
