const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, 'BBDD.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error al conectar a SQLite:', err.message);
    else console.log(`Conectado con éxito a ${dbPath}`);
});

db.getAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
});

db.allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
});

db.runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
    });
});

db.execAsync = (sql) => new Promise((resolve, reject) => {
    db.exec(sql, (err) => err ? reject(err) : resolve());
});

db.ready = (async () => {
    await db.runAsync('PRAGMA foreign_keys = ON');
    await db.runAsync(`
        CREATE TABLE IF NOT EXISTS grupo (
            id_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL UNIQUE
        )
    `);
    await db.runAsync(`
        CREATE TABLE IF NOT EXISTS usuarios (
            usuario TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            password_hash TEXT,
            id_grupo INTEGER,
            admin INTEGER DEFAULT 0,
            foto TEXT,
            FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo) ON DELETE SET NULL
        )
    `);
    await db.runAsync(`
        CREATE TABLE IF NOT EXISTS mensajes (
            id_mensajes INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
            id_grupo INTEGER NOT NULL,
            usuario TEXT NOT NULL,
            texto TEXT NOT NULL,
            FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo) ON DELETE CASCADE,
            FOREIGN KEY (usuario) REFERENCES usuarios(usuario) ON DELETE CASCADE
        )
    `);

    const columns = await db.allAsync('PRAGMA table_info(usuarios)');
    if (!columns.some((column) => column.name === 'password_hash')) {
        await db.runAsync('ALTER TABLE usuarios ADD COLUMN password_hash TEXT');
    }

    if (process.env.SEED_SAMPLE_DATA !== 'true') {
        return;
    }

    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || '';
    const passwordLength = Buffer.byteLength(adminPassword, 'utf8');
    if (passwordLength < 8 || passwordLength > 72) {
        throw new Error('INITIAL_ADMIN_PASSWORD debe tener entre 8 y 72 bytes para importar los datos de ejemplo.');
    }

    await db.execAsync(fs.readFileSync(path.join(__dirname, 'base.sql'), 'utf8'));

    const admin = await db.getAsync(
        'SELECT admin, password_hash FROM usuarios WHERE usuario = ?',
        ['ivan']
    );
    if (!admin || !admin.admin) {
        throw new Error('No se puede importar el administrador de ejemplo: ya existe un usuario ivan que no es administrador.');
    }
    if (!admin.password_hash) {
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        await db.runAsync(
            'UPDATE usuarios SET password_hash = ? WHERE usuario = ? AND admin = 1 AND password_hash IS NULL',
            [passwordHash, 'ivan']
        );
    }

    for (const usuario of ['Marcos', 'Jose', 'Pepe']) {
        const password = `${usuario}1234`;
        const passwordHash = await bcrypt.hash(password, 12);
        await db.runAsync(
            'UPDATE usuarios SET password_hash = ? WHERE usuario = ? AND admin = 0 AND password_hash IS NULL',
            [passwordHash, usuario]
        );
    }
})().catch((err) => {
    console.error('Error al preparar la base de datos:', err);
    throw err;
});

module.exports = db;
