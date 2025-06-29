var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require('cors');
const http = require('http');

var app = express();

// Create HTTP server 
const server = http.createServer(app);

// Initialize Socket.IO
const initializeSocket = require('./config/socket');
const io = initializeSocket(server);
app.set('io', io);

// CORS configuration
// const allowedOrigins = [
//   "http://localhost:5173",
//   "http://localhost:3000", 
//   "https://web-admin-doantotnghiep.onrender.com"
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true); 
//     }
//     return callback(new Error('Not allowed by CORS'));
//   },
//   methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//   credentials: true,
//   allowedHeaders: ["Content-Type", "Authorization"]
// }));

// CORS middleware 
app.use(cors({
  origin: '*', // ✅ Cho phép tất cả domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // ✅ Cho phép gửi cookie
}));

// ✅ Đáp ứng OPTIONS request cho preflight
// app.options('*', cors());

// Middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Routes
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/api');
const database = require('./config/dbContext');

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);
app.use('/api/users', usersRouter);

// Connect database
database.connect();

// Error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Export app and server
module.exports = { app, server };
