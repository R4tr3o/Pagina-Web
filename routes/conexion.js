const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conectamos con tu archivo BBDD.db que está en la misma carpeta routes
const dbPath = path.join(__dirname, 'BBDD.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error al conectar a SQLite:', err.message);
    else console.log('Conectado con éxito a BBDD.db');
});

module.exports = db;
