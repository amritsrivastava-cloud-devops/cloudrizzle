const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

const { authenticate, generateTokens } = require('../middleware/auth');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

const router = express.Router();

// Mock user store (replace with DB in production)
const users = new Map();

// Seed a demo user
users.set('demo@cloudrizzle.ai', {
  id: 'demo-user-001',
  name: 'Demo User',
  email: 'demo@cloudrizzle.ai',
  password: bcrypt.hashSync('Demo@12345', 12),
  role: 'admin',
  plan: 'pro',
  avatar: null,
  createdAt: new Date().toISOString()
});

// POST /api/auth/register
router.post('/register', [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    if (users.has(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = {
      id: uuidv4(),
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: 'developer',
      plan: 'free',
      avatar: null,
      createdAt: new Date().toISOString()
    };

    users.set(email, user);

    const { accessToken, refreshToken } = generateTokens(user);
    await cache.set(`refresh:${user.id}`, refreshToken, 7 * 24 * 3600);

    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({
      user: userWithoutPassword,
      accessToken,
      refreshToken
    });
  } catch (error) {
    logger.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = users.get(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await cache.set(`refresh:${user.id}`, refreshToken, 7 * 24 * 3600);

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, accessToken, refreshToken });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'cloudrizzle-refresh-secret-change-in-production'
    );

    const storedToken = await cache.get(`refresh:${decoded.id}`);
    if (storedToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Find user
    let user;
    for (const [, u] of users) {
      if (u.id === decoded.id) { user = u; break; }
    }
    if (!user) return res.status(401).json({ error: 'User not found' });

    const tokens = generateTokens(user);
    await cache.set(`refresh:${user.id}`, tokens.refreshToken, 7 * 24 * 3600);

    res.json(tokens);
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    await cache.set(`blacklist:${token}`, true, 900); // 15 min (access token TTL)
    await cache.del(`refresh:${req.user.id}`);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  let user;
  for (const [, u] of users) {
    if (u.id === req.user.id) { user = u; break; }
  }
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { password: _, ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword });
});

module.exports = router;
