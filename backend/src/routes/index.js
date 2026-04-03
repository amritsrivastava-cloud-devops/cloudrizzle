const express = require('express');
const router = express.Router();

const auth = require('./auth');
const projects = require('./projects');
const cloud = require('./cloud');
const deploy = require('./deploy');
const monitoring = require('./monitoring');
const billing = require('./billing');
const ai = require('./ai');
const templates = require('./templates');
const terraform = require('./terraform');

console.log({
  auth: typeof auth,
  projects: typeof projects,
  cloud: typeof cloud,
  deploy: typeof deploy,
  monitoring: typeof monitoring,
  billing: typeof billing,
  ai: typeof ai,
  templates: typeof templates,
  terraform: typeof terraform
});

router.use('/auth', auth);
router.use('/projects', projects);
router.use('/cloud', cloud);
router.use('/deploy', deploy);
router.use('/monitoring', monitoring);
router.use('/billing', billing);
router.use('/ai', ai);
router.use('/templates', templates);
router.use('/terraform', terraform);

module.exports = router;
