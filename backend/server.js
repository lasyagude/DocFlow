const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const { DEFAULT_MAX_JSON_SIZE, createRateLimiter, securityHeaders } = require('./middleware/security');

dotenv.config();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set to at least 32 characters.');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI must be set.');
  process.exit(1);
}

// CORS: allow local dev + deployed frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(securityHeaders);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin denied'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || DEFAULT_MAX_JSON_SIZE }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || DEFAULT_MAX_JSON_SIZE }));

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many authentication attempts. Please try again later.',
});

const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many requests. Please slow down.',
});

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api', apiLimiter);
app.use('/api/documents', require('./routes/documents'));
app.use('/api/ai', require('./routes/ai'));
app.use('/admin', apiLimiter, require('./routes/admin'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/pdf', require('./routes/pdf'));

app.get('/', (req, res) => {
  res.json({ message: 'DocFlow API is running!' });
});

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas!');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log('MongoDB connection error:', err.message);
  });

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err?.message === 'Unsupported file type') {
    return res.status(400).json({ success: false, message: err.message });
  }

  if (err?.message === 'CORS origin denied') {
    return res.status(403).json({ success: false, message: 'Origin not allowed' });
  }

  console.error('Unhandled server error:', err?.message || err);
  return res.status(500).json({ success: false, message: 'Server error' });
});
