# Modelo de Datos

La aplicación está soportada por una base de datos PostgreSQL alojada en Supabase.

## Tablas Principales

### 1. `localidades`
Catálogo de localidades donde opera Los Andes.
- `id`: UUID (PK)
- `nombre`: Nombre de la localidad.

### 2. `agroveterinarias`
Sedes físicas asociadas a las agroveterinarias con convenio.
- `id`: UUID (PK)
- `nombre`: Nombre comercial.
- `localidad_id`: FK a `localidades`.
- `direccion`, `telefono`.

### 3. `productos` y `agroveterinaria_productos`
Catálogo global de productos y la relación de qué agroveterinaria los vende y con qué porcentaje de descuento por convenio.

### 4. `servicios_veterinarios` y `agroveterinaria_servicios`
Catálogo de tipos de servicios (Ej: Baño, Consulta, Curación) y la tarifa base / porcentaje de cobertura asignado por cada sede.

### 5. `clientes`
Base de datos de clientes oficiales de Los Andes validados.
- `dni`: PK.
- `nombres`, `apellidos`, `localidad_id`.

### 6. `canjes` y `canjes_detalle`
Registros históricos de los beneficios aplicados en productos. Soporta compras de múltiples productos en una sola transacción.

### 7. `registros_servicios`
Histórico de servicios veterinarios ejecutados a los clientes.

### 8. `referidos`
Prospectos de clientes (Módulo de referidos).

### 9. `usuarios_roles`
Mapeo de usuarios creados en Supabase Auth (`auth.users`) con su rol respectivo (`ADMIN` o `AGROVET`) y su vinculación directa a una sede (`agroveterinaria_id`) en caso de ser Agroveterinarios.
