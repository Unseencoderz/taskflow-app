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

const corsOptions = process.env.CLIENT_URL
  ? { origin: process.env.CLIENT_URL, credentials: true }
  : { origin: true, credentials: true };

app.use(cors(corsOptions));
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
