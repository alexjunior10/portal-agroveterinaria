# Flujo de Autenticación y Autorización

## Contexto Global (`AuthContext`)
La aplicación maneja la sesión mediante el objeto `supabase.auth`. Cuando la aplicación carga, `AuthContext` verifica si hay una sesión activa y determina el rol del usuario consultando la tabla `usuarios_roles`.

## Roles de Usuario
Existen dos roles estrictamente definidos:
- **`ADMIN`**: Tiene acceso global a todas las pantallas de administración (`/admin`).
- **`AGROVET`**: Tiene acceso restringido al portal de su sede (`/veterinaria`). Depende de su `agroveterinaria_id` asociado.

## Creación de Usuarios (Manual para MVP)
Como alcance del MVP, la aplicación no tiene un flujo de registro para evitar registros falsos.
1. El Superadmin entra al Dashboard de Supabase.
2. Navega a `Authentication > Users > Add User`.
3. Ingresa correo y contraseña (ej. `admin@demo.com`).
4. Obtiene el UUID generado.
5. Inserta un registro manual en la tabla `usuarios_roles` del Editor SQL para mapear el UUID con su rol correspondiente.

## Protección de Rutas (`ProtectedRoute`)
El componente `<ProtectedRoute allowedRole="..."/>` asegura que:
- Si no hay sesión, se redirige a `/login`.
- Si un usuario `ADMIN` intenta ir a `/veterinaria`, es redirigido a `/admin`.
- Si un usuario `AGROVET` intenta ir a `/admin`, es redirigido a `/veterinaria`.
