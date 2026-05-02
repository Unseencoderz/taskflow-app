const express = require('express');
const cors = require('cors');

const authMiddleware = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const profileRoutes = require('./routes/profile');
const inviteRoutes = require('./routes/invites');
const notificationRoutes = require('./routes/notifications');

const app = express();

<<<<<<< HEAD
// Build an allowlist from CLIENT_URL (supports comma-separated list of origins)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((o) => o.trim().replace(/\/$/, ''))
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // If no allowlist is set, allow all origins (dev mode)
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
=======
const rawClientUrl = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.replace(/\/+$/, '')
  : null;

const corsOptions = {
  origin: rawClientUrl
    ? (origin, callback) => {
        if (!origin || origin === rawClientUrl) {
          callback(null, true);
        } else {
          callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
        }
      }
    : 'https://taskflow-app-production-66f4.up.railway.app',
>>>>>>> 8561c73c1189a7749b0f127059737615ff0c4310
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
