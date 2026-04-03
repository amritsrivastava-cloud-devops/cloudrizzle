const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

const executions = new Map();

// Terraform templates
const TERRAFORM_TEMPLATES = {
  'aws-ec2-basic': {
    id: 'aws-ec2-basic',
    name: 'AWS EC2 Instance',
    provider: 'aws',
    category: 'Compute',
    description: 'Launch a configurable EC2 instance with security group and key pair',
    variables: ['instance_type', 'ami_id', 'key_name', 'region'],
    template: `
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

variable "region" { default = "us-east-1" }
variable "instance_type" { default = "t3.micro" }
variable "ami_id" { default = "ami-0c02fb55956c7d316" }
variable "key_name" { description = "EC2 Key Pair name" }
variable "project_name" { default = "cloudrizzle" }

resource "aws_security_group" "main" {
  name_prefix = "\${var.project_name}-sg-"
  ingress {
    from_port = 22; to_port = 22; protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port = 80; to_port = 80; protocol = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port = 0; to_port = 0; protocol = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "\${var.project_name}-sg", ManagedBy = "CloudRizzle" }
}

resource "aws_instance" "main" {
  ami           = var.ami_id
  instance_type = var.instance_type
  key_name      = var.key_name
  vpc_security_group_ids = [aws_security_group.main.id]
  tags = { Name = "\${var.project_name}-instance", ManagedBy = "CloudRizzle" }
}

output "public_ip" { value = aws_instance.main.public_ip }
output "instance_id" { value = aws_instance.main.id }
`
  },
  'aws-s3-static': {
    id: 'aws-s3-static',
    name: 'AWS S3 Static Website',
    provider: 'aws',
    category: 'Storage',
    description: 'S3 bucket configured for static website hosting with CloudFront',
    variables: ['bucket_name', 'region'],
    template: `
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.region }

variable "bucket_name" { description = "S3 bucket name (must be globally unique)" }
variable "region" { default = "us-east-1" }

resource "aws_s3_bucket" "website" {
  bucket = var.bucket_name
  tags   = { Name = var.bucket_name, ManagedBy = "CloudRizzle" }
}

resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id
  index_document { suffix = "index.html" }
  error_document { key = "error.html" }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket                  = aws_s3_bucket.website.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

output "website_url" { value = aws_s3_bucket_website_configuration.website.website_endpoint }
output "bucket_arn"  { value = aws_s3_bucket.website.arn }
`
  },
  'aws-ecs-fargate': {
    id: 'aws-ecs-fargate',
    name: 'AWS ECS Fargate Cluster',
    provider: 'aws',
    category: 'Containers',
    description: 'Production ECS Fargate cluster with ALB, auto-scaling, and CloudWatch logs',
    variables: ['app_name', 'region', 'container_image', 'cpu', 'memory'],
    template: `
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.region }

variable "app_name"        { default = "my-app" }
variable "region"          { default = "us-east-1" }
variable "container_image" { description = "Docker image URI" }
variable "cpu"             { default = 256 }
variable "memory"          { default = 512 }
variable "desired_count"   { default = 2 }

resource "aws_ecs_cluster" "main" {
  name = "\${var.app_name}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = { ManagedBy = "CloudRizzle" }
}

resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/\${var.app_name}"
  retention_in_days = 14
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.app_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  
  container_definitions = jsonencode([{
    name  = var.app_name
    image = var.container_image
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

output "cluster_name" { value = aws_ecs_cluster.main.name }
output "cluster_arn"  { value = aws_ecs_cluster.main.arn }
`
  },
  'aws-rds-postgres': {
    id: 'aws-rds-postgres',
    name: 'AWS RDS PostgreSQL',
    provider: 'aws',
    category: 'Database',
    description: 'Managed PostgreSQL RDS instance with Multi-AZ and automated backups',
    variables: ['db_name', 'db_username', 'db_password', 'instance_class'],
    template: `
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" { region = var.region }

variable "region"         { default = "us-east-1" }
variable "db_name"        { description = "Database name" }
variable "db_username"    { description = "Master username" }
variable "db_password"    { description = "Master password"; sensitive = true }
variable "instance_class" { default = "db.t3.micro" }

resource "aws_db_instance" "main" {
  identifier           = "\${var.db_name}-db"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.instance_class
  allocated_storage    = 20
  max_allocated_storage = 100
  db_name             = var.db_name
  username            = var.db_username
  password            = var.db_password
  skip_final_snapshot = false
  final_snapshot_identifier = "\${var.db_name}-final-snapshot"
  backup_retention_period = 7
  deletion_protection     = true
  tags = { ManagedBy = "CloudRizzle" }
}

output "endpoint"    { value = aws_db_instance.main.endpoint }
output "db_name"     { value = aws_db_instance.main.db_name }
output "port"        { value = aws_db_instance.main.port }
`
  }
};

// GET /api/terraform/templates
router.get('/templates', authenticate, (req, res) => {
  const templates = Object.values(TERRAFORM_TEMPLATES).map(t => ({
    id: t.id,
    name: t.name,
    provider: t.provider,
    category: t.category,
    description: t.description,
    variables: t.variables
  }));
  res.json({ templates });
});

// GET /api/terraform/templates/:id
router.get('/templates/:id', authenticate, (req, res) => {
  const template = TERRAFORM_TEMPLATES[req.params.id];
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json({ template });
});

// POST /api/terraform/plan
router.post('/plan', authenticate, [
  body('templateId').optional().isString(),
  body('terraform').optional().isString(),
  body('variables').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { templateId, terraform, variables = {}, projectId } = req.body;

    let terraformCode = terraform;
    if (templateId && TERRAFORM_TEMPLATES[templateId]) {
      terraformCode = TERRAFORM_TEMPLATES[templateId].template;
    }

    if (!terraformCode) return res.status(400).json({ error: 'No Terraform code provided' });

    const executionId = uuidv4();

    // Simulate terraform plan
    const execution = {
      id: executionId,
      userId: req.user.id,
      projectId,
      type: 'plan',
      status: 'running',
      startedAt: new Date().toISOString(),
      logs: [],
      plan: null
    };

    executions.set(executionId, execution);

    // Emit start event
    req.io?.to(req.user.id).emit('terraform:plan:started', { executionId });

    // Simulate plan execution asynchronously
    simulateTerraformPlan(executionId, req.io, req.user.id);

    res.json({ executionId, status: 'running' });
  } catch (error) {
    logger.error('Terraform plan error:', error);
    res.status(500).json({ error: 'Failed to run terraform plan' });
  }
});

// POST /api/terraform/apply
router.post('/apply', authenticate, [
  body('executionId').isString()
], async (req, res) => {
  try {
    const { executionId, autoApprove = false } = req.body;
    const planExecution = executions.get(executionId);

    if (!planExecution || planExecution.userId !== req.user.id) {
      return res.status(404).json({ error: 'Plan execution not found' });
    }

    if (planExecution.status !== 'success') {
      return res.status(400).json({ error: 'Plan must be successful before applying' });
    }

    const applyId = uuidv4();
    const applyExecution = {
      id: applyId,
      userId: req.user.id,
      projectId: planExecution.projectId,
      type: 'apply',
      status: 'running',
      startedAt: new Date().toISOString(),
      logs: [],
      resources: []
    };

    executions.set(applyId, applyExecution);
    req.io?.to(req.user.id).emit('terraform:apply:started', { executionId: applyId });

    simulateTerraformApply(applyId, req.io, req.user.id);

    res.json({ executionId: applyId, status: 'running' });
  } catch (error) {
    logger.error('Terraform apply error:', error);
    res.status(500).json({ error: 'Failed to apply terraform' });
  }
});

// GET /api/terraform/executions/:id
router.get('/executions/:id', authenticate, (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution || execution.userId !== req.user.id) {
    return res.status(404).json({ error: 'Execution not found' });
  }
  res.json({ execution });
});

// Simulation helpers
async function simulateTerraformPlan(executionId, io, userId) {
  const execution = executions.get(executionId);
  const planLogs = [
    'Initializing the backend...',
    'Initializing provider plugins...',
    '- Finding hashicorp/aws versions matching "~> 5.0"...',
    '- Installing hashicorp/aws v5.31.0...',
    'Terraform has been successfully initialized!',
    '',
    'Terraform used the selected providers to generate the following execution plan.',
    'Resource actions are indicated with the following symbols:',
    '  + create',
    '',
    'Terraform will perform the following actions:',
    '',
    '  # aws_security_group.main will be created',
    '  + resource "aws_security_group" "main" {',
    '      + id          = (known after apply)',
    '      + name        = "cloudrizzle-sg-xxxx"',
    '    }',
    '',
    '  # aws_instance.main will be created',
    '  + resource "aws_instance" "main" {',
    '      + id           = (known after apply)',
    '      + instance_type = "t3.micro"',
    '      + ami           = "ami-0c02fb55956c7d316"',
    '    }',
    '',
    'Plan: 2 to add, 0 to change, 0 to destroy.',
    '',
    '─────────────────────────────────────────────────',
    '',
    'Note: Objects have changed outside of Terraform'
  ];

  for (let i = 0; i < planLogs.length; i++) {
    await new Promise(r => setTimeout(r, 80));
    execution.logs.push(planLogs[i]);
    io?.to(userId).emit('terraform:log', { executionId, log: planLogs[i] });
  }

  execution.status = 'success';
  execution.completedAt = new Date().toISOString();
  execution.plan = { toAdd: 2, toChange: 0, toDestroy: 0 };
  io?.to(userId).emit('terraform:plan:complete', { executionId, plan: execution.plan });
}

async function simulateTerraformApply(executionId, io, userId) {
  const execution = executions.get(executionId);
  const applyLogs = [
    'aws_security_group.main: Creating...',
    'aws_security_group.main: Creation complete after 2s [id=sg-0abc12345]',
    'aws_instance.main: Creating...',
    'aws_instance.main: Still creating... [10s elapsed]',
    'aws_instance.main: Still creating... [20s elapsed]',
    'aws_instance.main: Creation complete after 32s [id=i-0def67890]',
    '',
    'Apply complete! Resources: 2 added, 0 changed, 0 destroyed.',
    '',
    'Outputs:',
    'public_ip = "54.210.123.45"',
    'instance_id = "i-0def67890"'
  ];

  for (let i = 0; i < applyLogs.length; i++) {
    await new Promise(r => setTimeout(r, 120));
    execution.logs.push(applyLogs[i]);
    io?.to(userId).emit('terraform:log', { executionId, log: applyLogs[i] });
  }

  execution.status = 'success';
  execution.completedAt = new Date().toISOString();
  execution.resources = [
    { type: 'aws_security_group', id: 'sg-0abc12345', name: 'main' },
    { type: 'aws_instance', id: 'i-0def67890', name: 'main' }
  ];
  io?.to(userId).emit('terraform:apply:complete', { executionId, resources: execution.resources });
}

module.exports = router;
