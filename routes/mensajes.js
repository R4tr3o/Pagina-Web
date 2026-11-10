const express = require('express');
const router = express.Router();
const db = require('./conexion'); // Importa la conexión del paso anterior

// 1. RUTA PARA VER LOS MENSAJES DE MI GRUPO
router.get('/:id_grupo', (req, res) => {
    const idGrupo = req.params.id_grupo;
    const sql = `SELECT * FROM mensajes WHERE id_grupo = ? ORDER BY fecha_hora ASC`;

    db.all(sql, [idGrupo], (err, filas) => {
        if (err) {
            return res.status(500).send("Error al cargar los mensajes");
        }
        res.render('chat', { mensajes: filas, id_grupo: idGrupo });
    });
});

// 2. RUTA PARA ENVIAR UN MENSAJE NUEVO
router.post('/enviar', (req, res) => {
    const { usuario, texto, id_grupo } = req.body;

    // VERIFICACIÓN: Comprobar si el usuario pertenece a ese id_grupo
    const verficarSql = `SELECT id_grupo FROM usuarios WHERE usuario = ?`;

    db.get(verficarSql, [usuario], (err, row) => {
        if (err || !row) {
            return res.status(400).send("Usuario no encontrado.");
        }

        // Si el grupo coincide, se permite insertar el mensaje
        if (row.id_grupo == id_grupo) {
            const insertarSql = `INSERT INTO mensajes (id_grupo, usuario, texto) VALUES (?, ?, ?)`;

            db.run(insertarSql, [id_grupo, usuario, texto], (err) => {
                if (err) return res.status(500).send("Error al guardar el mensaje.");
                res.redirect(`/mensajes/${id_grupo}`);
            });
        } else {
            res.status(403).send("Error: No puedes enviar mensajes a un grupo al que no perteneces.");
        }
    });
});

module.exports = router;
