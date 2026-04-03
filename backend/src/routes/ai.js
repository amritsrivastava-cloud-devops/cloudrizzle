const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Conversations store
const conversations = new Map();

const SYSTEM_PROMPT = `You are CloudRizzle AI, an expert infrastructure assistant for a multi-cloud management platform. You help engineers with:

1. **Infrastructure Planning**: Design scalable, secure, cost-effective architectures on AWS, Azure, and GCP
2. **Terraform Code**: Generate production-grade Terraform configurations for any cloud resource
3. **Troubleshooting**: Debug infrastructure issues, analyze logs, diagnose performance problems
4. **Cost Optimization**: Identify savings opportunities, right-sizing recommendations
5. **Security**: Best practices, IAM policies, network security groups, compliance
6. **Deployment Strategies**: Blue/green, canary, rolling deployments

When generating Terraform code:
- Always include provider configuration
- Use variables and locals for reusability
- Add outputs for important resource attributes
- Include tags for cost allocation
- Follow least-privilege principle for IAM

Format your responses clearly with markdown. For code, always specify the language.
When users describe their infrastructure needs, ask clarifying questions about:
- Expected traffic/load
- Budget constraints
- Compliance requirements
- Existing infrastructure to integrate with`;

// POST /api/ai/chat
router.post('/chat', authenticate, [
  body('message').trim().notEmpty().isLength({ max: 4000 }),
  body('conversationId').optional().isString(),
  body('context').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { message, conversationId, context = {} } = req.body;

    // Get or create conversation
    let conversation;
    if (conversationId && conversations.has(conversationId)) {
      conversation = conversations.get(conversationId);
    } else {
      conversation = {
        id: uuidv4(),
        userId: req.user.id,
        messages: [],
        title: message.substring(0, 50) + '...',
        createdAt: new Date().toISOString()
      };
      conversations.set(conversation.id, conversation);
    }

    // Add user message
    conversation.messages.push({ role: 'user', content: message });

    // Build context string
    let contextStr = '';
    if (context.currentProject) {
      contextStr += `\nCurrent Project: ${context.currentProject.name} (${context.currentProject.provider} - ${context.currentProject.region})`;
    }
    if (context.cloudAccounts) {
      contextStr += `\nConnected Cloud Accounts: ${context.cloudAccounts.map(a => `${a.name} (${a.provider})`).join(', ')}`;
    }

    // Call Anthropic API
    const response = await callAnthropicAPI(conversation.messages, contextStr);

    // Add assistant message
    conversation.messages.push({ role: 'assistant', content: response });
    conversations.set(conversation.id, conversation);

    res.json({
      conversationId: conversation.id,
      message: response,
      title: conversation.title
    });
  } catch (error) {
    logger.error('AI chat error:', error);
    res.status(500).json({ error: 'AI service temporarily unavailable' });
  }
});

// POST /api/ai/generate-terraform
router.post('/generate-terraform', authenticate, [
  body('description').trim().notEmpty(),
  body('provider').isIn(['aws', 'azure', 'gcp']),
  body('resourceType').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { description, provider, resourceType, config = {} } = req.body;

    const prompt = `Generate production-grade Terraform code for the following infrastructure:

Provider: ${provider}
Resource Type: ${resourceType}
Description: ${description}
Additional Config: ${JSON.stringify(config, null, 2)}

Requirements:
1. Include provider configuration block
2. Use variables for all configurable values
3. Include outputs for important attributes
4. Add proper tags
5. Follow security best practices
6. Include comments explaining key decisions

Provide ONLY the Terraform code without explanation (the code should be self-documenting with comments).`;

    const response = await callAnthropicAPI([{ role: 'user', content: prompt }]);

    res.json({ terraform: response, provider, resourceType });
  } catch (error) {
    logger.error('Terraform generation error:', error);
    res.status(500).json({ error: 'Failed to generate Terraform code' });
  }
});

// POST /api/ai/analyze-cost
router.post('/analyze-cost', authenticate, [
  body('costData').isObject()
], async (req, res) => {
  try {
    const { costData, projectName } = req.body;

    const prompt = `Analyze the following cloud infrastructure costs and provide:
1. Top 3 cost optimization opportunities
2. Estimated savings for each
3. Risk assessment for implementing changes
4. Priority order for implementation

Cost Data:
${JSON.stringify(costData, null, 2)}

Project: ${projectName || 'Unknown'}

Format as a structured analysis with clear sections.`;

    const response = await callAnthropicAPI([{ role: 'user', content: prompt }]);
    res.json({ analysis: response });
  } catch (error) {
    logger.error('Cost analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze costs' });
  }
});

// GET /api/ai/conversations
router.get('/conversations', authenticate, (req, res) => {
  const userConvs = [...conversations.values()]
    .filter(c => c.userId === req.user.id)
    .map(c => ({
      id: c.id,
      title: c.title,
      messageCount: c.messages.length,
      createdAt: c.createdAt,
      lastMessage: c.messages[c.messages.length - 1]?.content?.substring(0, 100)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ conversations: userConvs });
});

// GET /api/ai/conversations/:id
router.get('/conversations/:id', authenticate, (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation || conversation.userId !== req.user.id) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json({ conversation });
});

// DELETE /api/ai/conversations/:id
router.delete('/conversations/:id', authenticate, (req, res) => {
  const conversation = conversations.get(req.params.id);
  if (!conversation || conversation.userId !== req.user.id) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  conversations.delete(req.params.id);
  res.json({ message: 'Conversation deleted' });
});

// Anthropic API call helper
async function callAnthropicAPI(messages, systemContext = '') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT + (systemContext ? '\n\nCurrent Context:' + systemContext : ''),
      messages: messages.slice(-20) // Keep last 20 messages for context window
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

module.exports = router;
