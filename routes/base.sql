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

-- 1. Insertar Grupos de Prueba
INSERT INTO grupo (id_grupo, nombre) VALUES (1, 'Desarrollo');
INSERT INTO grupo (id_grupo, nombre) VALUES (2, 'Diseño');

-- 2. Insertar Usuarios de Prueba
-- Iván y Ana están en el grupo 1 (Desarrollo). Carlos está en el grupo 2 (Diseño).
INSERT INTO usuarios (usuario, nombre, id_grupo, admin, foto) 
VALUES ('ivan', 'Iván Guerrero', 1, 1, 'foto_ivan.jpg');

INSERT INTO usuarios (usuario, nombre, id_grupo, admin, foto) 
VALUES ('Marcos', 'Marcos García', 1, 0, 'foto_marcos.jpg');

INSERT INTO usuarios (usuario, nombre, id_grupo, admin, foto) 
VALUES ('Jose', 'José Gonzalez', 2, 0, 'foto_jose.jpg');

INSERT INTO usuarios (usuario, nombre, id_grupo, admin, foto) 
VALUES ('Pepe', 'Pepe Ramos', 2, 0, 'foto_pepe.jpg');

-- 3. Insertar un mensaje inicial de prueba
INSERT INTO mensajes (id_grupo, usuario, texto) 
VALUES (1, 'ivan', '¡Hola! Bienvenidos al chat del grupo de Desarrollo.');
