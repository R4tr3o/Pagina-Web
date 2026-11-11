var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

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
    res.render('login', { title: 'Iniciar sesión' });
});

router.get('/panel', soloAdmin, (req, res) => {
    res.render('panel', { title: 'Panel de administración', usuarios: [] });
});

router.post('/panel/alta-usuario', soloAdmin, (req, res) => {
    res.status(501).send('La gestión de usuarios todavía no está conectada a la base de datos.');
});

router.post('/panel/baja-usuario/:id', soloAdmin, (req, res) => {
    res.status(501).send('La gestión de usuarios todavía no está conectada a la base de datos.');
});

module.exports = router;
