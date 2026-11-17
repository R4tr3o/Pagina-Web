const express = require('express');
const router = express.Router();
const db = require('./conexion');

router.use((req, res, next) => {
    if (!req.session.usuarioId) {
        return res.redirect('/login');
    }

    next();
});

async function obtenerGrupoUsuario(req) {
    return db.getAsync(
        'SELECT id_grupo FROM usuarios WHERE usuario = ?',
        [req.session.usuarioId]
    );
}

router.get('/', async (req, res, next) => {
    try {
        const usuario = await obtenerGrupoUsuario(req);
        if (!usuario || !usuario.id_grupo) {
            return res.status(403).send('Tu cuenta no tiene un grupo asignado para el chat.');
        }

        res.redirect(`/mensajes/${usuario.id_grupo}`);
    } catch (err) {
        next(err);
    }
});

router.get('/:id_grupo', async (req, res, next) => {
    const idGrupo = Number(req.params.id_grupo);
    if (!Number.isSafeInteger(idGrupo) || idGrupo < 1) {
        return res.status(404).send('Grupo no encontrado.');
    }

    try {
        const usuario = await obtenerGrupoUsuario(req);
        if (!usuario || usuario.id_grupo !== idGrupo) {
            return res.status(403).send('Solo puedes acceder al chat de tu grupo.');
        }

        const [grupo, mensajes] = await Promise.all([
            db.getAsync('SELECT nombre FROM grupo WHERE id_grupo = ?', [idGrupo]),
            db.allAsync(
                'SELECT usuario, texto, fecha_hora FROM mensajes WHERE id_grupo = ? ORDER BY fecha_hora ASC',
                [idGrupo]
            )
        ]);
        if (!grupo) {
            return res.status(404).send('Grupo no encontrado.');
        }

        res.render('chat', {
            title: `Chat de ${grupo.nombre}`,
            mensajes,
            id_grupo: idGrupo,
            nombre_grupo: grupo.nombre
        });
    } catch (err) {
        next(err);
    }
});

router.post('/enviar', async (req, res, next) => {
    const idGrupo = Number(req.body.id_grupo);
    const texto = typeof req.body.texto === 'string' ? req.body.texto.trim() : '';

    if (!Number.isSafeInteger(idGrupo) || idGrupo < 1 || !texto || texto.length > 2000) {
        return res.status(400).send('Escribe un mensaje de hasta 2000 caracteres.');
    }

    try {
        const usuario = await obtenerGrupoUsuario(req);
        if (!usuario || usuario.id_grupo !== idGrupo) {
            return res.status(403).send('Solo puedes enviar mensajes en el chat de tu grupo.');
        }

        await db.runAsync(
            'INSERT INTO mensajes (id_grupo, usuario, texto) VALUES (?, ?, ?)',
            [idGrupo, req.session.usuarioId, texto]
        );
        res.redirect(`/mensajes/${idGrupo}`);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
