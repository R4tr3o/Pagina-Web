# Página web grupal

## Inicio

Instala las dependencias y arranca el servidor:

```sh
npm install
npm start
```

La aplicación guarda los datos en `routes/BBDD.db`. Al arrancar, crea las tablas si no existen y añade la columna `password_hash` a las bases de datos existentes. La base local se conserva; no se borra al actualizar el esquema.

## Usuarios y acceso

- En desarrollo, el acceso inicial de administrador es `admin` / `1234`, siempre que no exista ya un usuario `admin` en la base de datos.
- Para importar una sola vez los grupos, usuarios y mensaje de ejemplo de `routes/base.sql`, establece `SEED_SAMPLE_DATA=true` y `INITIAL_ADMIN_PASSWORD` (mínimo 8 caracteres) antes de arrancar. La contraseña se guarda como hash bcrypt; el archivo SQL no contiene contraseñas. La importación es idempotente y no reemplaza registros existentes. Después de importarla, puedes quitar `SEED_SAMPLE_DATA`.
- Para pruebas, las cuentas de ejemplo `Marcos`, `Jose` y `Pepe` usan respectivamente `Marcos1234`, `Jose1234` y `Pepe1234`. Son contraseñas débiles: cámbialas antes de usar cuentas reales. Solo se asignan si la cuenta todavía no tiene contraseña.
- En producción, configura `SESSION_SECRET` y las credenciales iniciales en el entorno. No uses las credenciales de desarrollo.
- El panel permite crear cuentas con usuario, nombre, contraseña y rol. Las contraseñas nuevas se guardan como hashes bcrypt.
- Los grupos son opcionales al crear una cuenta. Para asignarlos, debe existir previamente el grupo en la tabla `grupo`.
- Las cuentas existentes sin `password_hash` se conservan, pero no pueden iniciar sesión con contraseña hasta que se les asigne una.

En PowerShell, ejecuta una vez, cambiando la contraseña por una propia:

```powershell
$env:SEED_SAMPLE_DATA = 'true'
$env:INITIAL_ADMIN_PASSWORD = 'elige-una-contraseña'
npm start
```