const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// GET /api/monitoring/metrics
router.get('/metrics', authenticate, (req, res) => {
  const { accountId, resourceId, metric = 'cpu', period = '1h' } = req.query;

  const dataPoints = generateTimeSeriesData(metric, period);
  res.json({ metric, period, dataPoints, resourceId });
});

// GET /api/monitoring/overview
router.get('/overview', authenticate, (req, res) => {
  res.json({
    alerts: [
      { id: '1', severity: 'critical', message: 'CPU usage above 90% on web-server-1', resource: 'i-0abc123', time: new Date(Date.now() - 300000).toISOString() },
      { id: '2', severity: 'warning', message: 'Memory usage at 78% on db-server-1', resource: 'i-0def456', time: new Date(Date.now() - 600000).toISOString() },
      { id: '3', severity: 'info', message: 'S3 bucket prod-data lifecycle rules applied', resource: 's3-bucket-prod', time: new Date(Date.now() - 3600000).toISOString() }
    ],
    metrics: {
      avgCpuUsage: 34.2,
      avgMemoryUsage: 61.8,
      totalRequests: 148420,
      errorRate: 0.23,
      avgLatency: 142,
      activeInstances: 12
    },
    services: [
      { name: 'Web Servers', status: 'healthy', instances: 3, cpu: 34, memory: 62 },
      { name: 'Database Cluster', status: 'warning', instances: 2, cpu: 45, memory: 78 },
      { name: 'Lambda Functions', status: 'healthy', instances: 24, cpu: 12, memory: 30 },
      { name: 'Load Balancers', status: 'healthy', instances: 2, cpu: 8, memory: 22 }
    ]
  });
});

// GET /api/monitoring/logs
router.get('/logs', authenticate, (req, res) => {
  const { resourceId, level, limit = 50, offset = 0 } = req.query;

  const logs = generateMockLogs(parseInt(limit));
  res.json({ logs, total: 1000, offset: parseInt(offset) });
});

// GET /api/monitoring/costs/forecast
router.get('/costs/forecast', authenticate, (req, res) => {
  const forecast = generateCostForecast();
  res.json(forecast);
});

function generateTimeSeriesData(metric, period) {
  const now = Date.now();
  const intervals = { '1h': 60, '6h': 72, '24h': 288, '7d': 168, '30d': 360 };
  const count = intervals[period] || 60;
  const intervalMs = { '1h': 60000, '6h': 300000, '24h': 300000, '7d': 3600000, '30d': 7200000 };
  const interval = intervalMs[period] || 60000;

  const baseValues = { cpu: 35, memory: 62, network: 45, disk: 70, requests: 1200, errors: 3 };
  const base = baseValues[metric] || 50;

  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(now - (count - i) * interval).toISOString(),
    value: Math.max(0, Math.min(100, base + (Math.random() - 0.5) * 20))
  }));
}

function generateMockLogs(count) {
  const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];
  const messages = [
    'Request processed successfully',
    'Database query executed in 23ms',
    'Cache hit for key user:12345',
    'Auto-scaling triggered: adding 2 instances',
    'SSL certificate renewed',
    'Backup completed: 4.2GB',
    'High CPU utilization detected on i-0abc123',
    'Lambda function timeout after 30s',
    'RDS connection pool exhausted',
    'S3 PutObject failed: AccessDenied'
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(Date.now() - i * 5000).toISOString(),
    level: levels[Math.floor(Math.random() * levels.length)],
    message: messages[Math.floor(Math.random() * messages.length)],
    resource: `resource-${Math.floor(Math.random() * 5)}`,
    region: 'us-east-1'
  }));
}

function generateCostForecast() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();

  return {
    currentMonthEstimate: 4705.40,
    previousMonth: 4320.18,
    percentChange: 8.9,
    forecast: months.map((month, i) => ({
      month,
      actual: i <= currentMonth ? 3800 + Math.random() * 1200 : null,
      forecast: i >= currentMonth ? 4200 + Math.random() * 1000 + i * 100 : null
    })),
    breakdown: [
      { service: 'EC2', amount: 2140.50, percentage: 45.5 },
      { service: 'RDS', amount: 890.20, percentage: 18.9 },
      { service: 'ECS/Fargate', amount: 654.30, percentage: 13.9 },
      { service: 'S3', amount: 320.80, percentage: 6.8 },
      { service: 'Lambda', amount: 180.40, percentage: 3.8 },
      { service: 'Other', amount: 519.20, percentage: 11.1 }
    ]
  };
}

module.exports = router;
