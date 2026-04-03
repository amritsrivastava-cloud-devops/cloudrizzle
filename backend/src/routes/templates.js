const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const TEMPLATES = [
  { id: 'tpl-001', name: 'LAMP Stack', provider: 'aws', category: 'Web', description: 'Linux, Apache, MySQL, PHP on EC2', icon: '🌐', difficulty: 'beginner', estimatedCost: '$45/mo' },
  { id: 'tpl-002', name: 'Kubernetes Cluster', provider: 'aws', category: 'Containers', description: 'EKS cluster with auto-scaling node groups', icon: '☸️', difficulty: 'advanced', estimatedCost: '$320/mo' },
  { id: 'tpl-003', name: 'Serverless API', provider: 'aws', category: 'Serverless', description: 'API Gateway + Lambda + DynamoDB', icon: '⚡', difficulty: 'intermediate', estimatedCost: '$5/mo' },
  { id: 'tpl-004', name: 'Data Warehouse', provider: 'aws', category: 'Analytics', description: 'Redshift cluster with S3 data lake', icon: '📊', difficulty: 'advanced', estimatedCost: '$580/mo' },
  { id: 'tpl-005', name: 'Static Website', provider: 'aws', category: 'Web', description: 'S3 + CloudFront + Route53 with SSL', icon: '🌍', difficulty: 'beginner', estimatedCost: '$3/mo' },
  { id: 'tpl-006', name: 'ML Training Pipeline', provider: 'gcp', category: 'ML/AI', description: 'Vertex AI + GCS + BigQuery for ML workloads', icon: '🤖', difficulty: 'advanced', estimatedCost: '$250/mo' },
  { id: 'tpl-007', name: 'Microservices Platform', provider: 'azure', category: 'Containers', description: 'AKS with Helm, Istio service mesh', icon: '🔧', difficulty: 'advanced', estimatedCost: '$420/mo' },
  { id: 'tpl-008', name: 'CI/CD Pipeline', provider: 'aws', category: 'DevOps', description: 'CodePipeline + CodeBuild + ECR + ECS', icon: '🔄', difficulty: 'intermediate', estimatedCost: '$35/mo' },
  { id: 'tpl-009', name: 'Monitoring Stack', provider: 'aws', category: 'Observability', description: 'Prometheus + Grafana + AlertManager on EC2', icon: '📡', difficulty: 'intermediate', estimatedCost: '$60/mo' },
  { id: 'tpl-010', name: 'PostgreSQL HA', provider: 'aws', category: 'Database', description: 'RDS PostgreSQL with Multi-AZ and read replicas', icon: '🗄️', difficulty: 'intermediate', estimatedCost: '$180/mo' },
  { id: 'tpl-011', name: 'Message Queue', provider: 'aws', category: 'Messaging', description: 'SQS + SNS + Lambda event processing', icon: '📨', difficulty: 'beginner', estimatedCost: '$15/mo' },
  { id: 'tpl-012', name: 'VPN Gateway', provider: 'azure', category: 'Networking', description: 'Azure VPN Gateway with site-to-site connection', icon: '🔐', difficulty: 'intermediate', estimatedCost: '$90/mo' }
];

router.get('/', authenticate, (req, res) => {
  const { provider, category, search } = req.query;
  let templates = [...TEMPLATES];

  if (provider) templates = templates.filter(t => t.provider === provider);
  if (category) templates = templates.filter(t => t.category === category);
  if (search) templates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(TEMPLATES.map(t => t.category))];
  res.json({ templates, categories, total: templates.length });
});

router.get('/:id', authenticate, (req, res) => {
  const template = TEMPLATES.find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json({ template });
});

module.exports = router;
