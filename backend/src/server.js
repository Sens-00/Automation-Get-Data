const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Redis = require('ioredis');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const redis = new Redis({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});

const ACCESS_SECRET = 'access_secret_key_123';
const REFRESH_SECRET = 'refresh_secret_key_123';

// Helper Response Format
const response = (res, statusCode, success, message, data = null) => {
  return res.status(statusCode).json({ success, message, data });
};

// Middleware Auth
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return response(res, 401, false, 'Access token required');

  jwt.verify(token, ACCESS_SECRET, (err, user) => {
    if (err) return response(res, 403, false, 'Invalid or expired access token');
    req.user = user;
    next();
  });
};

// --- AUTH ENDPOINTS ---

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return response(res, 400, false, 'Email and password (min 6 chars) required');
  }

  try {
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return response(res, 400, false, 'Email already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    return response(res, 201, true, 'User registered successfully');
  } catch (err) {
    return response(res, 500, false, err.message);
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return response(res, 400, false, 'User not found');

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return response(res, 400, false, 'Invalid credentials');

    const accessToken = jwt.sign({ id: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, email: user.email }, REFRESH_SECRET, { expiresIn: '7d' });

    await db.query('UPDATE users SET refresh_token = ? WHERE id = ?', [refreshToken, user.id]);

    return response(res, 200, true, 'Login successful', { accessToken, refreshToken, user: { id: user.id, email: user.email } });
  } catch (err) {
    return response(res, 500, false, err.message);
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return response(res, 401, false, 'Refresh Token required');

  try {
    const [users] = await db.query('SELECT * FROM users WHERE refresh_token = ?', [refreshToken]);
    if (users.length === 0) return response(res, 403, false, 'Invalid Refresh Token');

    jwt.verify(refreshToken, REFRESH_SECRET, (err, user) => {
      if (err) return response(res, 403, false, 'Expired Refresh Token');
      const newAccessToken = jwt.sign({ id: user.id, email: user.email }, ACCESS_SECRET, { expiresIn: '15m' });
      return response(res, 200, true, 'Token refreshed', { accessToken: newAccessToken });
    });
  } catch (err) {
    return response(res, 500, false, err.message);
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    await db.query('UPDATE users SET refresh_token = NULL WHERE id = ?', [req.user.id]);
    return response(res, 200, true, 'Logged out successfully');
  } catch (err) {
    return response(res, 500, false, err.message);
  }
});

// --- JOB & HISTORY ENDPOINTS ---

app.post('/api/jobs', authenticateToken, async (req, res) => {
  const { duration } = req.body;
  if (!duration || duration <= 0) return response(res, 400, false, 'Valid duration (seconds) required');

  try {
    const [result] = await db.query(
      'INSERT INTO scroll_jobs (user_id, duration, status) VALUES (?, ?, ?)',
      [req.user.id, duration, 'pending']
    );
    const jobId = result.insertId;

    // Push job to Redis Queue
    await redis.lpush('shorts_queue', JSON.stringify({ jobId, duration: parseInt(duration) }));

    return response(res, 201, true, 'Job submitted successfully', { jobId, duration, status: 'pending' });
  } catch (err) {
    return response(res, 500, false, err.message);
  }
});

app.get('/api/jobs/history', authenticateToken, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const [rows] = await db.query(
      'SELECT id, duration, status, actual_duration, video_data, created_at, finished_at FROM scroll_jobs WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
      [req.user.id, limit, offset]
    );

    const [totalRows] = await db.query('SELECT COUNT(*) as total FROM scroll_jobs WHERE user_id = ?', [req.user.id]);
    const total = totalRows[0].total;

    return response(res, 200, true, 'History fetched', {
      jobs: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    return response(res, 500, false, err.message);
  }
});

// Callback dari Python Service
app.post('/api/internal/jobs/callback', async (req, res) => {
  const { jobId, status, actual_duration, video_data, error_message } = req.body;
  try {
    await db.query(
      'UPDATE scroll_jobs SET status = ?, actual_duration = ?, video_data = ?, error_message = ?, finished_at = NOW() WHERE id = ?',
      [status, actual_duration, JSON.stringify(video_data || []), error_message || null, jobId]
    );
    return response(res, 200, true, 'Callback received and updated');
  } catch (err) {
    return response(res, 500, false, err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend API running on port ${PORT}`));