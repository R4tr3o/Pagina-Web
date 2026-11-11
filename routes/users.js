var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// 2. Procesa los datos del formulario de login
router.post('/login', (req, res) => {
    // Ahora leemos 'usuario' del cuerpo de la petición
    const usuario = req.body.usuario; 
    const password = req.body.password;

    // Comprobación manual usando 'admin' como usuario
    if (usuario === 'admin' && password === '1234') {
        req.session.usuarioId = 1;
        req.session.rol = 'admin';
        res.redirect('/panel'); 
    } else {
        res.status(401).send('Usuario o contraseña incorrectos.');
    }
});

module.exports = router;
