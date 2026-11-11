var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var db = require('./conexion');

function requiereSesion(req, res, next) {
    if (!req.session.usuarioId) {
        return res.redirect('/login');
    }

    next();
}

function soloAdmin(req, res, next) {
    if (!req.session.usuarioId) {
        return res.redirect('/login');
    }

    if (req.session.rol !== 'admin') {
        return res.status(403).send('Acceso denegado: Área exclusiva para Administradores');
    }

    next();
}
router.get('/login', (req, res) => {
    if (req.session.usuarioId) {
        return res.redirect('/');
    }

    res.render('login', {
        title: 'Iniciar sesión',
        error: req.query.error === 'credenciales'
            ? 'Usuario o contraseña incorrectos.'
            : null
    });
});

router.get('/', requiereSesion, async (req, res, next) => {
    try {
        const cuenta = await db.getAsync(
            `SELECT usuarios.usuario, usuarios.nombre, usuarios.admin,
                    grupo.id_grupo, grupo.nombre AS nombre_grupo
             FROM usuarios
             LEFT JOIN grupo ON grupo.id_grupo = usuarios.id_grupo
             WHERE usuarios.usuario = ?`,
            [req.session.usuarioId]
        );

        res.render('inicio', {
            title: 'Inicio',
            usuario: cuenta,
            admin: req.session.rol === 'admin'
        });
    } catch (err) {
        next(err);
    }
});

router.get('/panel', soloAdmin, async (req, res, next) => {
    try {
        const [usuarios, grupos] = await Promise.all([
        db.allAsync(`
            SELECT usuarios.usuario, usuarios.nombre, usuarios.id_grupo,
                   usuarios.admin, grupo.nombre AS nombre_grupo
            FROM usuarios
            LEFT JOIN grupo ON grupo.id_grupo = usuarios.id_grupo
            ORDER BY usuarios.usuario
        `),
        db.allAsync('SELECT id_grupo, nombre FROM grupo ORDER BY nombre')
        ]);
        const notices = {
            created: 'Usuario creado correctamente.',
            deleted: 'Usuario eliminado correctamente.'
        };
        const errors = {
            invalid: 'Revisa los datos: usuario, nombre, contraseña, rol o grupo no válidos.',
            duplicate: 'Ya existe un usuario con ese nombre.',
            group: 'El grupo seleccionado no existe.',
            missing: 'El usuario que intentas eliminar ya no existe.',
            lastAdmin: 'No se puede eliminar al último administrador.',
            self: 'No puedes eliminar tu propia cuenta.'
        };

        res.render('panel', {
            title: 'Panel de administración',
            usuarios,
            grupos,
            notice: notices[req.query.notice] || null,
            error: errors[req.query.error] || null
        });
    } catch (err) {
        next(err);
    }
});

router.post('/panel/alta-usuario', soloAdmin, async (req, res, next) => {
    const usuario = typeof req.body.usuario === 'string' ? req.body.usuario.trim() : '';
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const rol = req.body.rol;
    const grupoRaw = req.body.id_grupo;
    const idGrupo = grupoRaw ? Number(grupoRaw) : null;

    if (!usuario || usuario.length > 40 || !nombre || nombre.length > 100 ||
        Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72 ||
        !['usuario', 'admin'].includes(rol) ||
        (idGrupo !== null && (!Number.isSafeInteger(idGrupo) || idGrupo < 1))) {
        return res.redirect('/panel?error=invalid');
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        await db.runAsync(
            'INSERT INTO usuarios (usuario, nombre, password_hash, id_grupo, admin) VALUES (?, ?, ?, ?, ?)',
            [usuario, nombre, passwordHash, idGrupo, rol === 'admin' ? 1 : 0]
        );
        res.redirect('/panel?notice=created');
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('usuarios.usuario')) {
            return res.redirect('/panel?error=duplicate');
        }
        if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('FOREIGN KEY')) {
            return res.redirect('/panel?error=group');
        }
        next(err);
    }
});

router.post('/panel/baja-usuario/:usuario', soloAdmin, async (req, res, next) => {
    const usuario = req.params.usuario;

    if (usuario === req.session.usuarioId) {
        return res.redirect('/panel?error=self');
    }

    try {
        const resultado = await db.runAsync(`
            DELETE FROM usuarios
            WHERE usuario = ?
              AND (admin = 0 OR (SELECT COUNT(*) FROM usuarios WHERE admin = 1) > 1)
        `, [usuario]);

        if (resultado.changes) {
            return res.redirect('/panel?notice=deleted');
        }

        const existe = await db.getAsync(
            'SELECT usuario FROM usuarios WHERE usuario = ?',
            [usuario]
        );
        if (!existe) {
            return res.redirect('/panel?error=missing');
        }

        res.redirect('/panel?error=lastAdmin');
    } catch (err) {
        next(err);
    }
});

module.exports = router;
