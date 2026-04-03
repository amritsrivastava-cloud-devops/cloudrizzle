const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const setupWebSocket = (io) => {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'cloudrizzle-secret-key-change-in-production'
      );
      socket.userId = decoded.id;
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`WebSocket connected: ${userId} (${socket.id})`);

    // Join user's private room
    socket.join(userId);

    socket.on('subscribe:monitoring', ({ accountId, resourceId }) => {
      socket.join(`monitoring:${accountId}`);
      logger.debug(`User ${userId} subscribed to monitoring for account ${accountId}`);
    });

    socket.on('unsubscribe:monitoring', ({ accountId }) => {
      socket.leave(`monitoring:${accountId}`);
    });

    socket.on('subscribe:deployment', ({ deploymentId }) => {
      socket.join(`deployment:${deploymentId}`);
    });

    socket.on('ping', () => socket.emit('pong', { timestamp: Date.now() }));

    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket disconnected: ${userId} - ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`WebSocket error for ${userId}:`, error);
    });

    // Send welcome event
    socket.emit('connected', {
      userId,
      timestamp: new Date().toISOString(),
      message: 'CloudRizzle AI WebSocket connected'
    });
  });

  // Start live metrics broadcaster
  startMetricsBroadcast(io);
};

// Broadcast live metrics every 5 seconds
function startMetricsBroadcast(io) {
  setInterval(() => {
    const metrics = {
      timestamp: new Date().toISOString(),
      cpu: 30 + Math.random() * 40,
      memory: 55 + Math.random() * 20,
      network: { in: Math.floor(Math.random() * 1000), out: Math.floor(Math.random() * 800) },
      requests: Math.floor(1000 + Math.random() * 500),
      errors: Math.floor(Math.random() * 5),
      latency: Math.floor(100 + Math.random() * 100)
    };
    io.emit('metrics:live', metrics);
  }, 5000);
}

module.exports = { setupWebSocket };
