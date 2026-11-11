var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var crypto = require('crypto');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var db = require('./routes/conexion');
var mensajesRouter = require('./routes/mensajes');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: app.get('env') === 'production'
  }
}));
app.use(function(req, res, next) {
  res.locals.usuarioSesion = req.session.usuarioId || null;
  res.locals.rolSesion = req.session.rol || null;
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(function(req, res, next) {
  db.ready.then(function() {
    next();
  }).catch(next);
});

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/mensajes', mensajesRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
