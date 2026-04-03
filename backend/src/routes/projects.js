const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router(); // ✅ SINGLE router

const projects = new Map();
const deployments = new Map();

// ===================== PROJECTS =====================
router.get('/', authenticate, (req, res) => {
  const userProjects = [...projects.values()].filter(p => p.userId === req.user.id);
  res.json({ projects: userProjects });
});

router.post('/', authenticate, [
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

router.get('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ project });
});

router.delete('/:id', authenticate, (req, res) => {
  const project = projects.get(req.params.id);
  if (!project || project.userId !== req.user.id) {
    return res.status(404).json({ error: 'Project not found' });
  }
  projects.delete(req.params.id);
  res.json({ message: 'Project deleted' });
});

// ===================== DEPLOYMENTS =====================
router.get('/deployments/all', authenticate, (req, res) => {
  const { projectId } = req.query;
  let userDeployments = [...deployments.values()].filter(d => d.userId === req.user.id);

  if (projectId) {
    userDeployments = userDeployments.filter(d => d.projectId === projectId);
  }

  res.json({
    deployments: userDeployments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  });
});

router.post('/deployments', authenticate, [
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

    simulateDeployment(deployment.id, req.io, req.user.id);

    res.status(201).json({ deployment });
  } catch (error) {
    logger.error('Deploy error:', error);
    res.status(500).json({ error: 'Deployment failed' });
  }
});

router.get('/deployments/:id', authenticate, (req, res) => {
  const deployment = deployments.get(req.params.id);
  if (!deployment || deployment.userId !== req.user.id) {
    return res.status(404).json({ error: 'Deployment not found' });
  }
  res.json({ deployment });
});

// ===================== SIMULATION =====================
async function simulateDeployment(deploymentId, io, userId) {
  const deployment = deployments.get(deploymentId);

  deployment.status = 'running';
  deployment.startedAt = new Date().toISOString();

  io?.to(userId).emit('deployment:started', { deploymentId });

  const steps = [
    'Validating configuration...',
    'Generating Terraform plan...',
    'Initializing providers...',
    'Creating resources...',
    'Deployment complete!'
  ];

  for (const step of steps) {
    await new Promise(r => setTimeout(r, 800));
    deployment.logs.push({
      timestamp: new Date().toISOString(),
      message: step,
      level: 'INFO'
    });

    io?.to(userId).emit('deployment:log', { deploymentId, log: step });
  }

  deployment.status = 'success';
  deployment.completedAt = new Date().toISOString();

  io?.to(userId).emit('deployment:complete', {
    deploymentId,
    status: 'success'
  });
}

module.exports = router; // ✅ FINAL FIX
