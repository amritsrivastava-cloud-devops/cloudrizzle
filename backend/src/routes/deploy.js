const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/projects', require('./projects'));
router.use('/cloud', require('./cloud'));
router.use('/monitoring', require('./monitoring'));
router.use('/billing', require('./billing'));
router.use('/ai', require('./ai'));
router.use('/templates', require('./templates'));
router.use('/terraform', require('./terraform'));

module.exports = router;
