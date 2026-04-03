// billing.js
const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

router.get('/usage', authenticate, (req, res) => {
  res.json({
    plan: 'pro',
    currentPeriod: { start: '2024-01-01', end: '2024-01-31' },
    usage: { deployments: 47, aiRequests: 312, monitoredResources: 28 },
    limits: { deployments: 100, aiRequests: 1000, monitoredResources: 50 },
    invoices: [
      { id: 'inv-001', amount: 49.00, date: '2024-01-01', status: 'paid' },
      { id: 'inv-002', amount: 49.00, date: '2023-12-01', status: 'paid' }
    ]
  });
});

module.exports = router;
