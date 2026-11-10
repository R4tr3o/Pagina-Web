-- 1. Habilitar el soporte de claves foráneas en SQLite
PRAGMA foreign_keys = ON;

-- 2. Tabla de Grupos
CREATE TABLE grupo (
    id_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
);

-- 3. Tabla de Usuarios
CREATE TABLE usuarios (
    usuario TEXT PRIMARY KEY,          -- Nombre de usuario único (ej: "jdoe")
    nombre TEXT NOT NULL,               -- Nombre completo de la persona
    id_grupo INTEGER,                   -- ID del grupo (relación 1 a muchos)
    admin INTEGER DEFAULT 0,            -- 0 = Usuario normal, 1 = Administrador
    foto TEXT,                          -- Ruta o nombre del archivo de la foto
    FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo) ON DELETE SET NULL
);

-- 4. Tabla de Mensajes
CREATE TABLE mensajes (
    id_mensajes INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP, -- Se genera automáticamente
    id_grupo INTEGER NOT NULL,
    usuario TEXT NOT NULL,
    texto TEXT NOT NULL,
    FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo) ON DELETE CASCADE,
    FOREIGN KEY (usuario) REFERENCES usuarios(usuario) ON DELETE CASCADE
);

INSERT INTO usuarios (usuario, nombre, id_grupo, admin, foto) 
VALUES ('admin', 'admin', 0, 1, 'foto_admin.jpg');
