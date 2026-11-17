var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var fs = require('fs');
var multer = require('multer');
var path = require('path');
var db = require('./conexion');
var fotos = require('./fotos');
var avatarDirectory = process.env.AVATAR_DIR
    ? path.resolve(process.env.AVATAR_DIR)
    : path.join(__dirname, '..', 'uploads', 'avatars');
var uploadFoto = multer({
    storage: multer.memoryStorage(),
    limits: {
        files: 1,
        fileSize: 2 * 1024 * 1024
    }
});

function extensionFoto(buffer, mimeType) {
    if (mimeType === 'image/jpeg' &&
        buffer.length >= 3 &&
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpg';
    }
    if (mimeType === 'image/png' &&
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
        return 'png';
    }
    if (mimeType === 'image/webp' &&
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP') {
        return 'webp';
    }
    return null;
}

function procesarCargaFoto(req, res, next) {
    uploadFoto.single('foto')(req, res, (err) => {
        if (!err) return next();
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.redirect('/panel?error=photoSize');
        }
        if (err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.redirect('/panel?error=photoType');
        }
        next(err);
    });
}

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

    const adminUsername = process.env.ADMIN_USERNAME ||
        (process.env.NODE_ENV === 'production' ? '' : 'admin');
    db.getAsync(
        'SELECT admin FROM usuarios WHERE usuario = ?',
        [req.session.usuarioId]
    ).then((cuenta) => {
        const administradorDePrueba = !cuenta &&
            req.session.rol === 'admin' &&
            req.session.usuarioId === adminUsername;
        if ((!cuenta || !cuenta.admin) && !administradorDePrueba) {
            req.session.rol = 'usuario';
            return res.status(403).send('Acceso denegado: Área exclusiva para Administradores');
        }

        req.session.rol = 'admin';
        next();
    }).catch(next);
}
router.get('/login', (req, res) => {
    if (req.session.usuarioId) {
        return res.redirect('/inicio');
    }

    res.render('login', {
        title: 'Iniciar sesión',
        error: req.query.error === 'credenciales'
            ? 'Usuario o contraseña incorrectos.'
            : null
    });
});

router.get('/', (req, res) => {
    res.render('index', {
        title: 'Conecta | Trabajo en equipo'
    });
});

router.get('/avatars/:filename', requiereSesion, async (req, res, next) => {
    const filename = req.params.filename;
    if (!fotos.fotoGestionada(filename)) {
        return res.sendStatus(404);
    }

    try {
        const foto = await db.getAsync(
            'SELECT usuario FROM usuarios WHERE foto = ?',
            [filename]
        );
        if (!foto) {
            return res.sendStatus(404);
        }

        res.set('Cache-Control', 'private, max-age=3600');
        res.set('X-Content-Type-Options', 'nosniff');
        res.sendFile(path.join(avatarDirectory, filename), (err) => {
            if (!err) return;
            if (err.code === 'ENOENT' && !res.headersSent) {
                return res.sendStatus(404);
            }
            next(err);
        });
    } catch (err) {
        next(err);
    }
});

router.get('/inicio', requiereSesion, async (req, res, next) => {
    try {
        const cuenta = await db.getAsync(
            `SELECT usuarios.usuario, usuarios.nombre, usuarios.admin, usuarios.foto,
                    grupo.id_grupo, grupo.nombre AS nombre_grupo
             FROM usuarios
             LEFT JOIN grupo ON grupo.id_grupo = usuarios.id_grupo
             WHERE usuarios.usuario = ?`,
            [req.session.usuarioId]
        );
        if (cuenta) {
            cuenta.fotoUrl = fotos.urlFoto(cuenta.foto);
        }

        res.render('inicio', {
            title: 'Inicio',
            usuario: cuenta,
            admin: req.session.rol === 'admin'
        });
    } catch (err) {
        next(err);
    }
});

router.get('/cambiar-contrasena', requiereSesion, (req, res) => {
    const errors = {
        invalid: 'La nueva contraseña debe tener entre 8 y 72 bytes.',
        mismatch: 'La nueva contraseña y su confirmación no coinciden.',
        incorrect: 'La contraseña actual es incorrecta.',
        unavailable: 'Esta cuenta no tiene una contraseña propia configurada.'
    };

    res.render('cambiar-contrasena', {
        title: 'Cambiar contraseña',
        error: errors[req.query.error] || null,
        notice: req.query.notice === 'updated'
            ? 'La contraseña se ha cambiado correctamente.'
            : null
    });
});

router.post('/cambiar-contrasena', requiereSesion, async (req, res, next) => {
    const passwordActual = typeof req.body.passwordActual === 'string'
        ? req.body.passwordActual
        : '';
    const passwordNueva = typeof req.body.passwordNueva === 'string'
        ? req.body.passwordNueva
        : '';
    const confirmarPassword = typeof req.body.confirmarPassword === 'string'
        ? req.body.confirmarPassword
        : '';

    if (Buffer.byteLength(passwordNueva, 'utf8') < 8 ||
        Buffer.byteLength(passwordNueva, 'utf8') > 72) {
        return res.redirect('/cambiar-contrasena?error=invalid');
    }
    if (passwordNueva !== confirmarPassword) {
        return res.redirect('/cambiar-contrasena?error=mismatch');
    }

    try {
        const cuenta = await db.getAsync(
            'SELECT password_hash FROM usuarios WHERE usuario = ?',
            [req.session.usuarioId]
        );
        if (!cuenta || !cuenta.password_hash) {
            return res.redirect('/cambiar-contrasena?error=unavailable');
        }
        if (!await bcrypt.compare(passwordActual, cuenta.password_hash)) {
            return res.redirect('/cambiar-contrasena?error=incorrect');
        }

        const passwordHash = await bcrypt.hash(passwordNueva, 12);
        await db.runAsync(
            'UPDATE usuarios SET password_hash = ? WHERE usuario = ?',
            [passwordHash, req.session.usuarioId]
        );
        res.redirect('/cambiar-contrasena?notice=updated');
    } catch (err) {
        next(err);
    }
});

router.get('/panel', soloAdmin, async (req, res, next) => {
    try {
        const [usuarios, grupos] = await Promise.all([
            db.allAsync(`
                SELECT usuarios.usuario, usuarios.nombre, usuarios.foto, usuarios.id_grupo,
                       usuarios.admin, grupo.nombre AS nombre_grupo
                FROM usuarios
                LEFT JOIN grupo ON grupo.id_grupo = usuarios.id_grupo
                ORDER BY usuarios.usuario
            `),
            db.allAsync(`
                SELECT grupo.id_grupo, grupo.nombre, COUNT(usuarios.usuario) AS miembros
                FROM grupo
                LEFT JOIN usuarios ON usuarios.id_grupo = grupo.id_grupo
                GROUP BY grupo.id_grupo, grupo.nombre
                ORDER BY grupo.nombre
            `)
        ]);
        usuarios.forEach((usuario) => {
            usuario.fotoUrl = fotos.urlFoto(usuario.foto);
        });
        const notices = {
            created: 'Usuario creado correctamente.',
            photoUpdated: 'Foto de usuario actualizada correctamente.',
            groupCreated: 'Grupo creado correctamente.',
            groupDeleted: 'Grupo eliminado correctamente.',
            updated: 'Usuario actualizado correctamente.',
            deleted: 'Usuario eliminado correctamente.'
        };
        const errors = {
            invalid: 'Revisa los datos: usuario, nombre, contraseña, rol o grupo no válidos.',
            duplicate: 'Ya existe un usuario con ese nombre.',
            group: 'El grupo seleccionado no existe.',
            groupInvalid: 'El nombre del grupo debe tener entre 1 y 50 caracteres.',
            groupDuplicate: 'Ya existe un grupo con ese nombre.',
            groupMissing: 'El grupo que intentas borrar ya no existe.',
            groupInUse: 'No se puede borrar el grupo mientras tenga usuarios asignados.',
            photoRequired: 'Selecciona una imagen para subir.',
            photoType: 'La imagen debe ser JPG, PNG o WebP válida.',
            photoSize: 'La imagen no puede superar los 2 MB.',
            photoUserMissing: 'El usuario cuya foto intentas cambiar ya no existe.',
            missing: 'El usuario que intentas eliminar ya no existe.',
            lastAdmin: 'Debe quedar al menos un administrador en el sistema.',
            self: 'No puedes eliminar tu propia cuenta.',
            selfRole: 'No puedes quitarte el rol de administrador desde tu propia cuenta.'
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

router.post('/panel/foto/:usuario', soloAdmin, procesarCargaFoto, async (req, res, next) => {
    if (!req.file) {
        return res.redirect('/panel?error=photoRequired');
    }

    const extension = extensionFoto(req.file.buffer, req.file.mimetype);
    if (!extension) {
        return res.redirect('/panel?error=photoType');
    }

    try {
        const cuenta = await db.getAsync(
            'SELECT foto FROM usuarios WHERE usuario = ?',
            [req.params.usuario]
        );
        if (!cuenta) {
            return res.redirect('/panel?error=photoUserMissing');
        }

        await fs.promises.mkdir(avatarDirectory, { recursive: true });
        const filename = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
        const fotoPath = path.join(avatarDirectory, filename);
        await fs.promises.writeFile(fotoPath, req.file.buffer, { flag: 'wx' });

        let resultado;
        try {
            resultado = await db.runAsync(
                'UPDATE usuarios SET foto = ? WHERE usuario = ?',
                [filename, req.params.usuario]
            );
        } catch (err) {
            try {
                await fs.promises.unlink(fotoPath);
            } catch (cleanupError) {
                if (cleanupError.code !== 'ENOENT') {
                    console.error('Error al limpiar una foto no guardada:', cleanupError);
                }
            }
            return next(err);
        }

        if (!resultado.changes) {
            await fs.promises.unlink(fotoPath);
            return res.redirect('/panel?error=photoUserMissing');
        }

        if (fotos.fotoGestionada(cuenta.foto)) {
            try {
                await fs.promises.unlink(path.join(avatarDirectory, cuenta.foto));
            } catch (err) {
                if (err.code !== 'ENOENT') {
                    console.error('Error al borrar la foto anterior:', err);
                }
            }
        }

        res.redirect('/panel?notice=photoUpdated');
    } catch (err) {
        next(err);
    }
});

router.post('/panel/alta-grupo', soloAdmin, async (req, res, next) => {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';

    if (!nombre || nombre.length > 50) {
        return res.redirect('/panel?error=groupInvalid');
    }

    try {
        await db.runAsync('INSERT INTO grupo (nombre) VALUES (?)', [nombre]);
        res.redirect('/panel?notice=groupCreated');
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('grupo.nombre')) {
            return res.redirect('/panel?error=groupDuplicate');
        }
        next(err);
    }
});

router.post('/panel/baja-grupo/:id_grupo', soloAdmin, async (req, res, next) => {
    const idGrupo = Number(req.params.id_grupo);
    if (!Number.isSafeInteger(idGrupo) || idGrupo < 1) {
        return res.redirect('/panel?error=groupMissing');
    }

    try {
        const resultado = await db.runAsync(`
            DELETE FROM grupo
            WHERE id_grupo = ?
              AND NOT EXISTS (
                  SELECT 1 FROM usuarios WHERE usuarios.id_grupo = grupo.id_grupo
              )
        `, [idGrupo]);

        if (resultado.changes) {
            return res.redirect('/panel?notice=groupDeleted');
        }

        const grupo = await db.getAsync(
            'SELECT id_grupo FROM grupo WHERE id_grupo = ?',
            [idGrupo]
        );
        if (!grupo) {
            return res.redirect('/panel?error=groupMissing');
        }

        res.redirect('/panel?error=groupInUse');
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
        const cuentaExistente = await db.getAsync(
            'SELECT usuario FROM usuarios WHERE usuario COLLATE NOCASE = ?',
            [usuario]
        );
        if (cuentaExistente) {
            return res.redirect('/panel?error=duplicate');
        }

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

router.post('/panel/modificar-usuario/:usuario', soloAdmin, async (req, res, next) => {
    const usuario = req.params.usuario;
    const rol = req.body.rol;
    const grupoRaw = req.body.id_grupo;
    const idGrupo = grupoRaw === '' ? null : Number(grupoRaw);

    if (!['usuario', 'admin'].includes(rol) ||
        typeof grupoRaw !== 'string' ||
        (idGrupo !== null && (!Number.isSafeInteger(idGrupo) || idGrupo < 1))) {
        return res.redirect('/panel?error=invalid');
    }
    if (usuario === req.session.usuarioId && rol !== 'admin') {
        return res.redirect('/panel?error=selfRole');
    }

    try {
        const cuenta = await db.getAsync(
            'SELECT usuario FROM usuarios WHERE usuario = ?',
            [usuario]
        );
        if (!cuenta) {
            return res.redirect('/panel?error=missing');
        }

        if (idGrupo !== null) {
            const grupo = await db.getAsync(
                'SELECT id_grupo FROM grupo WHERE id_grupo = ?',
                [idGrupo]
            );
            if (!grupo) {
                return res.redirect('/panel?error=group');
            }
        }

        const resultado = await db.runAsync(`
            UPDATE usuarios
            SET admin = ?, id_grupo = ?
            WHERE usuario = ?
              AND (? = 1 OR EXISTS (
                  SELECT 1 FROM usuarios AS otro_admin
                  WHERE otro_admin.admin = 1
                    AND otro_admin.usuario <> ?
              ))
        `, [rol === 'admin' ? 1 : 0, idGrupo, usuario, rol === 'admin' ? 1 : 0, usuario]);

        if (!resultado.changes) {
            const existe = await db.getAsync(
                'SELECT usuario FROM usuarios WHERE usuario = ?',
                [usuario]
            );
            if (!existe) {
                return res.redirect('/panel?error=missing');
            }
            return res.redirect('/panel?error=lastAdmin');
        }

        res.redirect('/panel?notice=updated');
    } catch (err) {
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
