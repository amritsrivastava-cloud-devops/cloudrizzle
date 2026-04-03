require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const logger = require('./utils/logger');
const { connectDB } = require('./utils/database');
const { connectRedis } = require('./utils/redis');
const { setupWebSocket } = require('./websocket/socketManager');

// Routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const cloudRoutes = require('./routes/cloud');
const deployRoutes = require('./routes/deploy');
const monitoringRoutes = require('./routes/monitoring');
const billingRoutes = require('./routes/billing');
const aiRoutes = require('./routes/ai');
const templateRoutes = require('./routes/templates');
const terraformRoutes = require('./routes/terraform');

const app = express();
const server = http.createServer(app);

// WebSocket setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'AI rate limit exceeded, please wait.' }
});

app.use(limiter);
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'CloudRizzle AI API'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/cloud', cloudRoutes);
app.use('/api/deploy', deployRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/terraform', terraformRoutes);

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack, url: req.url });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Bootstrap
async function bootstrap() {
  try {
    await connectDB();
    await connectRedis();
    setupWebSocket(io);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      logger.info(`🚀 CloudRizzle AI Server running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

module.exports = { app, io };
