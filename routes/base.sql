-- 1. Habilitar el soporte de claves foráneas en SQLite
PRAGMA foreign_keys = ON;

-- 2. Tabla de Grupos
CREATE TABLE IF NOT EXISTS grupo (
    id_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
);

-- 3. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    usuario TEXT PRIMARY KEY,          -- Nombre de usuario único (ej: "jdoe")
    nombre TEXT NOT NULL,               -- Nombre completo de la persona
    password_hash TEXT,                 -- Contraseña cifrada para iniciar sesión
    id_grupo INTEGER,                   -- ID del grupo (relación 1 a muchos)
    admin INTEGER DEFAULT 0,            -- 0 = Usuario normal, 1 = Administrador
    foto TEXT,                          -- Ruta o nombre del archivo de la foto
    FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo) ON DELETE SET NULL
);

-- 4. Tabla de Mensajes
CREATE TABLE IF NOT EXISTS mensajes (
    id_mensajes INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP, -- Se genera automáticamente
    id_grupo INTEGER NOT NULL,
    usuario TEXT NOT NULL,
    texto TEXT NOT NULL,
    FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo) ON DELETE CASCADE,
    FOREIGN KEY (usuario) REFERENCES usuarios(usuario) ON DELETE CASCADE
);

-- Los INSERT son idempotentes: importar este archivo no duplica datos.
INSERT OR IGNORE INTO grupo (nombre) VALUES ('Desarrollo');
INSERT OR IGNORE INTO grupo (nombre) VALUES ('Diseño');

INSERT OR IGNORE INTO usuarios (usuario, nombre, id_grupo, admin, foto)
VALUES (
    'ivan', 'Iván Guerrero',
    (SELECT id_grupo FROM grupo WHERE nombre = 'Desarrollo'),
    1, 'foto_ivan.jpg'
);

INSERT OR IGNORE INTO usuarios (usuario, nombre, id_grupo, admin, foto)
VALUES (
    'Marcos', 'Marcos García',
    (SELECT id_grupo FROM grupo WHERE nombre = 'Desarrollo'),
    0, 'foto_marcos.jpg'
);

INSERT OR IGNORE INTO usuarios (usuario, nombre, id_grupo, admin, foto)
VALUES (
    'Jose', 'José Gonzalez',
    (SELECT id_grupo FROM grupo WHERE nombre = 'Diseño'),
    0, 'foto_jose.jpg'
);

INSERT OR IGNORE INTO usuarios (usuario, nombre, id_grupo, admin, foto)
VALUES (
    'Pepe', 'Pepe Ramos',
    (SELECT id_grupo FROM grupo WHERE nombre = 'Diseño'),
    0, 'foto_pepe.jpg'
);

INSERT INTO mensajes (id_grupo, usuario, texto)
SELECT grupo.id_grupo, 'ivan', '¡Hola! Bienvenidos al chat del grupo de Desarrollo.'
FROM grupo
WHERE grupo.nombre = 'Desarrollo'
  AND NOT EXISTS (
      SELECT 1 FROM mensajes
      WHERE usuario = 'ivan'
        AND texto = '¡Hola! Bienvenidos al chat del grupo de Desarrollo.'
  );
