# Página web grupal

## Inicio

Instala las dependencias y arranca el servidor:

```sh
npm install
npm start
```

La interfaz utiliza Bootstrap 5 instalado localmente, por lo que sus estilos no dependen de una CDN externa.
La página pública de `/` presenta Conecta y enlaza al inicio de sesión; tras entrar, cada usuario accede a `/inicio`.

Durante el desarrollo, usa `npm run dev`: el servidor se reinicia al guardar cambios en el código o las vistas. Después solo tienes que recargar la página en el navegador.

La aplicación guarda los datos en `routes/BBDD.db`. Al arrancar, crea las tablas si no existen y añade la columna `password_hash` a las bases de datos existentes. La base local se conserva; no se borra al actualizar el esquema.

## Usuarios y acceso

- En desarrollo, los grupos, usuarios y mensaje de ejemplo de `routes/base.sql` se cargan automáticamente al arrancar. Las contraseñas se guardan como hashes bcrypt y solo se asignan a cuentas que todavía no tienen contraseña.
- No uses las credenciales de desarrollo en producción. En producción, configura `SESSION_SECRET`, `SEED_SAMPLE_DATA=true` e `INITIAL_ADMIN_PASSWORD` de forma segura en el entorno.
- El panel permite crear usuarios y cambiar el rol o grupo de las cuentas existentes. No permite quitar el rol del administrador conectado ni dejar el sistema sin administradores. Las contraseñas nuevas se guardan como hashes bcrypt.
- El administrador puede subir o cambiar la foto de cada usuario desde el panel. Se aceptan JPG, PNG y WebP de hasta 2 MB; las fotos se guardan en `uploads/avatars/` y solo se sirven a usuarios con sesión iniciada. Para compartir una foto nueva con el equipo, sube el archivo de `uploads/avatars/` a Git y guarda su asignación en `routes/base.sql`.
- El panel permite crear y borrar grupos. Un grupo con usuarios asignados no se puede borrar; al borrar un grupo vacío también se borran sus mensajes.
- Cada usuario con una contraseña configurada puede cambiarla desde el menú «Cambiar contraseña», confirmando primero su contraseña actual.
- Los grupos son opcionales al crear una cuenta. Para asignarlos, debe existir previamente el grupo en la tabla `grupo`.
- Las cuentas existentes sin `password_hash` se conservan, pero no pueden iniciar sesión con contraseña hasta que se les asigne una.
- Después de iniciar sesión, todos los usuarios llegan a `/inicio`. Desde allí acceden al chat de su grupo y los administradores también al panel. Los mensajes se publican con el usuario de la sesión, y un usuario no puede leer ni escribir en el chat de otro grupo.
- Si las credenciales no son correctas, se vuelve al login y se muestra un aviso. El menú también permite cerrar sesión.

Para iniciar en desarrollo, basta con ejecutar:

```powershell
npm start
```