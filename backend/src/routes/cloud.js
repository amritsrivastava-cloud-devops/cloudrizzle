const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

const router = express.Router();

// In-memory store (replace with DB)
const cloudAccounts = new Map();

// Seed demo accounts
cloudAccounts.set('demo-aws-001', {
  id: 'demo-aws-001',
  userId: 'demo-user-001',
  provider: 'aws',
  name: 'Production AWS',
  accountId: '123456789012',
  region: 'us-east-1',
  status: 'active',
  lastSync: new Date().toISOString(),
  resources: { ec2: 12, s3: 8, lambda: 24, rds: 3 },
  monthlyCost: 2847.32
});

cloudAccounts.set('demo-gcp-001', {
  id: 'demo-gcp-001',
  userId: 'demo-user-001',
  provider: 'gcp',
  name: 'Analytics GCP',
  accountId: 'my-analytics-project',
  region: 'us-central1',
  status: 'active',
  lastSync: new Date().toISOString(),
  resources: { compute: 5, gcs: 12, gke: 2 },
  monthlyCost: 1203.18
});

cloudAccounts.set('demo-azure-001', {
  id: 'demo-azure-001',
  userId: 'demo-user-001',
  provider: 'azure',
  name: 'Dev Azure',
  accountId: 'sub-xxxxxxxx',
  region: 'eastus',
  status: 'active',
  lastSync: new Date().toISOString(),
  resources: { vms: 4, blob: 6, aks: 1 },
  monthlyCost: 654.90
});

// GET /api/cloud/accounts
router.get('/accounts', authenticate, (req, res) => {
  const accounts = [...cloudAccounts.values()].filter(a => a.userId === req.user.id);
  res.json({ accounts });
});

// POST /api/cloud/accounts
router.post('/accounts', authenticate, [
  body('provider').isIn(['aws', 'azure', 'gcp']),
  body('name').trim().notEmpty(),
  body('credentials').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { provider, name, region, credentials, accountId } = req.body;

    // Validate credentials (mock)
    const isValid = await validateCloudCredentials(provider, credentials);
    if (!isValid) return res.status(400).json({ error: 'Invalid cloud credentials' });

    const account = {
      id: uuidv4(),
      userId: req.user.id,
      provider,
      name,
      accountId: accountId || credentials.accountId,
      region: region || getDefaultRegion(provider),
      status: 'active',
      lastSync: new Date().toISOString(),
      resources: {},
      monthlyCost: 0,
      createdAt: new Date().toISOString()
    };

    cloudAccounts.set(account.id, account);
    req.io?.to(req.user.id).emit('cloud:account:added', account);

    res.status(201).json({ account });
  } catch (error) {
    logger.error('Add cloud account error:', error);
    res.status(500).json({ error: 'Failed to add cloud account' });
  }
});

// GET /api/cloud/accounts/:id/resources
router.get('/accounts/:id/resources', authenticate, async (req, res) => {
  const account = cloudAccounts.get(req.params.id);
  if (!account || account.userId !== req.user.id) {
    return res.status(404).json({ error: 'Account not found' });
  }

  // Mock resources data
  const resources = generateMockResources(account.provider);
  res.json({ resources, account });
});

// GET /api/cloud/accounts/:id/costs
router.get('/accounts/:id/costs', authenticate, async (req, res) => {
  const account = cloudAccounts.get(req.params.id);
  if (!account || account.userId !== req.user.id) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const costs = generateMockCosts(account.provider);
  res.json({ costs });
});

// DELETE /api/cloud/accounts/:id
router.delete('/accounts/:id', authenticate, (req, res) => {
  const account = cloudAccounts.get(req.params.id);
  if (!account || account.userId !== req.user.id) {
    return res.status(404).json({ error: 'Account not found' });
  }

  cloudAccounts.delete(req.params.id);
  res.json({ message: 'Account removed' });
});

// GET /api/cloud/summary
router.get('/summary', authenticate, (req, res) => {
  const accounts = [...cloudAccounts.values()].filter(a => a.userId === req.user.id);
  const totalCost = accounts.reduce((sum, a) => sum + (a.monthlyCost || 0), 0);

  res.json({
    totalAccounts: accounts.length,
    totalCost,
    costsByProvider: accounts.reduce((acc, a) => {
      acc[a.provider] = (acc[a.provider] || 0) + a.monthlyCost;
      return acc;
    }, {}),
    accounts: accounts.map(a => ({ id: a.id, name: a.name, provider: a.provider, status: a.status, cost: a.monthlyCost }))
  });
});

// Helpers
async function validateCloudCredentials(provider, credentials) {
  // In production, actually test the credentials against the cloud provider
  if (provider === 'aws') return !!(credentials.accessKeyId && credentials.secretAccessKey);
  if (provider === 'azure') return !!(credentials.subscriptionId && credentials.tenantId);
  if (provider === 'gcp') return !!(credentials.projectId && credentials.serviceAccountKey);
  return false;
}

function getDefaultRegion(provider) {
  const defaults = { aws: 'us-east-1', azure: 'eastus', gcp: 'us-central1' };
  return defaults[provider];
}

function generateMockResources(provider) {
  const resources = {
    aws: [
      { id: 'i-0abc123', type: 'EC2', name: 'web-server-1', status: 'running', region: 'us-east-1', cost: 45.6 },
      { id: 'i-0def456', type: 'EC2', name: 'db-server-1', status: 'running', region: 'us-east-1', cost: 91.2 },
      { id: 's3-bucket-prod', type: 'S3', name: 'prod-data-bucket', status: 'active', region: 'us-east-1', cost: 12.4 },
      { id: 'lambda-api', type: 'Lambda', name: 'api-handler', status: 'active', region: 'us-east-1', cost: 0.8 },
      { id: 'rds-main', type: 'RDS', name: 'postgres-main', status: 'available', region: 'us-east-1', cost: 180.0 }
    ],
    gcp: [
      { id: 'vm-001', type: 'Compute', name: 'app-server', status: 'running', region: 'us-central1', cost: 67.2 },
      { id: 'gcs-001', type: 'GCS', name: 'data-lake-bucket', status: 'active', region: 'us-central1', cost: 8.4 },
      { id: 'gke-001', type: 'GKE', name: 'k8s-cluster', status: 'running', region: 'us-central1', cost: 320.0 }
    ],
    azure: [
      { id: 'vm-azure-001', type: 'VM', name: 'win-server-1', status: 'running', region: 'eastus', cost: 156.0 },
      { id: 'blob-001', type: 'Blob', name: 'backups-storage', status: 'active', region: 'eastus', cost: 24.5 },
      { id: 'aks-001', type: 'AKS', name: 'prod-k8s', status: 'running', region: 'eastus', cost: 280.0 }
    ]
  };
  return resources[provider] || [];
}

function generateMockCosts(provider) {
  const days = 30;
  const costs = [];
  let base = provider === 'aws' ? 90 : provider === 'gcp' ? 40 : 22;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    costs.push({
      date: date.toISOString().split('T')[0],
      amount: parseFloat((base + Math.random() * 10 - 5).toFixed(2))
    });
  }
  return costs;
}

module.exports = router;
