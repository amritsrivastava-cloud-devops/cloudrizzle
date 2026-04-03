const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const projectRouter = express.Router();
const deployRouter = express.Router();

const projects = new Map();
const deployments = new Map();

// Seed demo projects
projects.set('proj-001', {
  id: 'proj-001', userId: 'demo-user-001', name: 'Production API',
  description: 'Main production API infrastructure', provider: 'aws',
  region: 'us-east-1', status: 'active', cost: 2847.32,
  tags: ['production', 'api'], createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
});
projects.set('proj-002', {
  id: 'proj-002', userId: 'demo-user-001', name: 'Analytics Platform',
  description: 'Data analytics pipeline on GCP', provider: 'gcp',
  region: 'us-central1', status: 'active', cost: 1203.18,
  tags: ['analytics', 'data'], createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
});
projects.set('proj-003', {
  id: 'proj-003', userId: 'demo-user-001', name: 'Dev Environment',
  description: 'Development and staging environment', provider: 'azure',
  region: 'eastus', status: 'active', cost: 654.90,
  tags: ['dev', 'staging'], createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
});

// ===================== PROJECTS =====================
projectRouter.get('/', authenticate, (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.userId === req.user.id);
  res.json({ projects: userProjects });
});

projectRouter.post('/', authenticate, [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('provider').isIn(['aws', 'azure', 'gcp']),
  body('region').trim().notEmpty()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const project = {
    id: uuidv4(),
    userId: req.user.id,
    ...req.body,
    status: 'active',
    cost: 0,
    createdAt: new Date().toISOString()
  };
  projects.set(project.id, project);
  res.status(201).json({ project });
});

projectRouter.get('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) return res.status(404).json({ error: 'Project not found' });
  res.json({ project });
});

projectRouter.delete('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) return res.status(404).json({ error: 'Project not found' });
  projects.delete(req.params.id);
  res.json({ message: 'Project deleted' });
});

// ===================== DEPLOYMENTS =====================
deployRouter.get('/', authenticate, (req, res) => {
  const { projectId } = req.query;
  let userDeployments = [...deployments.values()].filter(d => d.userId === req.user.id);
  if (projectId) userDeployments = userDeployments.filter(d => d.projectId === projectId);
  res.json({ deployments: userDeployments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) });
});

deployRouter.post('/', authenticate, [
  body('projectId').isString(),
  body('name').trim().notEmpty(),
  body('type').trim().notEmpty(),
  body('config').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { projectId, name, type, config, templateId } = req.body;

    const project = projects.get(projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const deployment = {
      id: uuidv4(),
      userId: req.user.id,
      projectId,
      name,
      type,
      config,
      templateId,
      status: 'pending',
      logs: [],
      resources: [],
      cost: 0,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    deployments.set(deployment.id, deployment);
    req.io?.to(req.user.id).emit('deployment:created', deployment);

    // Simulate deployment process
    simulateDeployment(deployment.id, req.io, req.user.id);

    res.status(201).json({ deployment });
  } catch (error) {
    logger.error('Deploy error:', error);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

deployRouter.get('/:id', authenticate, (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment || deployment.userId !== req.user.id) {
    return res.status(404).json({ error: 'Deployment not found' });
  }
  res.json({ deployment });
});

async function simulateDeployment(deploymentId, io, userId) {
  const deployment = deployments.get(deploymentId);
  deployment.status = 'running';
  deployment.startedAt = new Date().toISOString();
  io?.to(userId).emit('deployment:started', { deploymentId });

  const steps = [
    'Validating configuration...',
    'Generating Terraform plan...',
    'Initializing providers...',
    'Creating security groups...',
    'Provisioning compute resources...',
    'Configuring networking...',
    'Setting up monitoring...',
    'Deployment complete!'
  ];

  for (const step of steps) {
    await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
    deployment.logs.push({ timestamp: new Date().toISOString(), message: step, level: 'INFO' });
    io?.to(userId).emit('deployment:log', { deploymentId, log: step });
  }

  deployment.status = 'success';
  deployment.completedAt = new Date().toISOString();
  deployment.resources = [
    { type: deployment.type, id: `resource-${Date.now()}`, status: 'running' }
  ];
  io?.to(userId).emit('deployment:complete', { deploymentId, status: 'success' });
}

module.exports = { projectRouter, deployRouter };
