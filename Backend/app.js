const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const path = require('path');
const flash = require('connect-flash');
const expressSession = require('express-session');
const helmet = require('helmet');
const cors = require('cors');

require('dotenv').config();

const connectDB = require('./config/mongodb.js');
const adminRouter = require('./routes/adminRouter');
const doctorRouter = require('./routes/doctorRouter.js');
console.log('Doctor router loaded:', !!doctorRouter);
const indexRouter = require('./routes/indexRouter');
const patientRouter = require('./routes/patientRouter');
const newsRouter = require('./routes/newsRouter');
const specialtyRouter = require('./routes/specialtyRouter');

const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// CORS configuration
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

// General CORS middleware
app.use(cors(corsOptions));

// Serve static files with CORS
app.use('/images/uploads/doctors', cors(corsOptions), express.static(path.join(__dirname, 'public', 'uploads', 'doctors')));
app.use('/images/uploads/specialties', cors(corsOptions), express.static(path.join(__dirname, 'public', 'uploads', 'specialties')));
app.use('/images/uploads/news', cors(corsOptions), express.static(path.join(__dirname, 'public', 'uploads', 'news')));
app.use('/images/uploads/misc', cors(corsOptions), express.static(path.join(__dirname, 'public', 'uploads', 'misc')));

// Other middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.EXPRESS_SESSION_SECRET || 'default_secret_key',
}));
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/patient', patientRouter);
app.use('/doctor', doctorRouter);
console.log('Doctor routes mounted at /doctor');
app.use('/api/news', newsRouter);
app.use('/api/specialty', specialtyRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Lỗi server:', err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Lỗi server nội bộ',
    });
});

app.listen(port, () => {
    console.log(`Server đang chạy trên cổng ${port}`);
});