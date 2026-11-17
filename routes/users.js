var express = require('express');
var router = express.Router();
var bcrypt = require('bcrypt');
var db = require('./conexion');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.post('/login', async (req, res, next) => {
    const usuario = typeof req.body.usuario === 'string' ? req.body.usuario.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    try {
        const cuenta = await db.getAsync(
            'SELECT usuario, password_hash, admin FROM usuarios WHERE usuario = ?',
            [usuario]
        );
        const contraseñaValida = cuenta && cuenta.password_hash
            ? await bcrypt.compare(password, cuenta.password_hash)
            : false;
        const adminUsername = process.env.ADMIN_USERNAME ||
            (process.env.NODE_ENV === 'production' ? '' : 'admin');
        const adminPassword = process.env.ADMIN_PASSWORD ||
            (process.env.NODE_ENV === 'production' ? '' : '1234');
        const administradorDePrueba = !cuenta && adminUsername && adminPassword &&
            usuario === adminUsername && password === adminPassword;

        if (!contraseñaValida && !administradorDePrueba) {
            return res.redirect('/login?error=credenciales');
        }

        req.session.regenerate((err) => {
            if (err) return next(err);
            req.session.usuarioId = contraseñaValida ? cuenta.usuario : adminUsername;
            req.session.rol = contraseñaValida && cuenta.admin ? 'admin' : 'usuario';
            if (administradorDePrueba) req.session.rol = 'admin';
            res.redirect('/');
        });
    } catch (err) {
        next(err);
    }
});

router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

module.exports = router;
