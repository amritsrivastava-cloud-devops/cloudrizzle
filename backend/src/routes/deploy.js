const express = require('express');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Re-export the deploy router from projects.js
const { deployRouter } = require('./projects');

module.exports = deployRouter;
