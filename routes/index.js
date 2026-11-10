var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

function soloAdmin(req, res, next) {
    if (req.session.usuarioId && req.session.rol === 'admin') { 
        next(); 
    } else {
        res.status(403).send('Acceso denegado: Área exclusiva para Administradores');
    }
}
router.get('/login', (req, res) => {
});

router.post('/login', (req, res) => {
});

router.get('/panel', soloAdmin, (req, res) => {
});

router.post('/panel/alta-usuario', soloAdmin, async (req, res) => {
});

router.post('/panel/baja-usuario/:id', soloAdmin, (req, res) => {
});

module.exports = router;
