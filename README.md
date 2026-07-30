# Portal Agroveterinaria - MVP

Este es el Producto Mínimo Viable (MVP) para el ecosistema de beneficios de Caja Los Andes enfocado en el sector rural y agroveterinario. Permite la gestión de descuentos en productos e insumos, cobertura de servicios veterinarios básicos, y el registro estructurado de clientes referidos (prospectos).

## Objetivo del MVP
Validar el interés y operatividad de las Agroveterinarias aliadas y la respuesta de los clientes rurales a un ecosistema de beneficios, minimizando la fricción tecnológica mediante una aplicación web de fácil adopción, rápida y segura.

## Tecnologías Utilizadas
* **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
* **Estilos e Interfaz**: [TailwindCSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
* **Enrutamiento**: [React Router v6](https://reactrouter.com/)
* **Backend y Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL, Supabase Auth)
* **Reportes**: `exceljs`, `file-saver`

## Estructura del Proyecto

```
caja-los-andes-beneficios-mvp/
├── docs/                      # Documentación técnica de arquitectura y flujos
├── src/
│   ├── components/            # Componentes reutilizables (Protected Routes)
│   ├── context/               # AuthContext para gestión global de sesión
│   ├── lib/                   # Configuración del cliente Supabase
│   ├── pages/
│   │   ├── admin/             # Portal del administrador central
│   │   ├── auth/              # Pantalla de login de la aplicación
│   │   └── veterinaria/       # Portal exclusivo para sedes agroveterinarias
│   ├── App.tsx                # Configuración principal de enrutamiento
│   ├── index.css              # Utilidades de Tailwind y estilos base
│   └── types.ts               # Definiciones de TypeScript
├── vercel.json                # Reglas de enrutamiento para despliegue en Vercel
└── setup_auth.sql             # Script SQL para habilitar usuarios y roles
```

## Ejecución Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Variables de entorno:**
   Crea un archivo `.env` basado en `.env.example`:
   ```env
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## Despliegue en Producción
El proyecto está optimizado para funcionar en **Vercel**. Ver `docs/Guia_Despliegue.md` para más información sobre cómo mapear el archivo `vercel.json` y configurar el proyecto.
