const { DataTypes } = require('sequelize');
const { getDB } = require('../utils/database');
const bcrypt = require('bcryptjs');

// ===================== USER MODEL =====================
const defineUserModel = (sequelize) => sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(255), unique: true, allowNull: false, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'developer', 'viewer'), defaultValue: 'developer' },
  avatar: { type: DataTypes.STRING(500) },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastLogin: { type: DataTypes.DATE },
  stripeCustomerId: { type: DataTypes.STRING(100) },
  plan: { type: DataTypes.ENUM('free', 'pro', 'enterprise'), defaultValue: 'free' },
  settings: { type: DataTypes.JSONB, defaultValue: {} }
}, {
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  },
  instanceMethods: {}
});

// ===================== CLOUD ACCOUNT MODEL =====================
const defineCloudAccountModel = (sequelize) => sequelize.define('CloudAccount', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  provider: { type: DataTypes.ENUM('aws', 'azure', 'gcp'), allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  accountId: { type: DataTypes.STRING(100) },
  region: { type: DataTypes.STRING(50) },
  credentials: { type: DataTypes.JSONB, allowNull: false }, // encrypted in service layer
  status: { type: DataTypes.ENUM('active', 'inactive', 'error'), defaultValue: 'active' },
  lastSync: { type: DataTypes.DATE },
  metadata: { type: DataTypes.JSONB, defaultValue: {} }
});

// ===================== PROJECT MODEL =====================
const defineProjectModel = (sequelize) => sequelize.define('Project', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  cloudAccountId: { type: DataTypes.UUID },
  name: { type: DataTypes.STRING(100), allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('active', 'deploying', 'failed', 'archived'), defaultValue: 'active' },
  provider: { type: DataTypes.ENUM('aws', 'azure', 'gcp'), allowNull: false },
  region: { type: DataTypes.STRING(50) },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  terraformState: { type: DataTypes.JSONB },
  cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  metadata: { type: DataTypes.JSONB, defaultValue: {} }
});

// ===================== DEPLOYMENT MODEL =====================
const defineDeploymentModel = (sequelize) => sequelize.define('Deployment', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  projectId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  templateId: { type: DataTypes.STRING(100) },
  name: { type: DataTypes.STRING(100), allowNull: false },
  type: { type: DataTypes.STRING(50) }, // ec2, s3, lambda, rds, etc.
  status: { type: DataTypes.ENUM('pending', 'running', 'success', 'failed', 'rolled_back'), defaultValue: 'pending' },
  config: { type: DataTypes.JSONB, defaultValue: {} },
  terraformPlan: { type: DataTypes.TEXT },
  terraformApply: { type: DataTypes.TEXT },
  logs: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  resources: { type: DataTypes.JSONB, defaultValue: [] },
  cost: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  startedAt: { type: DataTypes.DATE },
  completedAt: { type: DataTypes.DATE }
});

// ===================== AI CONVERSATION MODEL =====================
const defineConversationModel = (sequelize) => sequelize.define('Conversation', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  projectId: { type: DataTypes.UUID },
  title: { type: DataTypes.STRING(200) },
  messages: { type: DataTypes.JSONB, defaultValue: [] },
  context: { type: DataTypes.JSONB, defaultValue: {} }
});

let models = {};

const initModels = () => {
  const db = getDB();
  models.User = defineUserModel(db);
  models.CloudAccount = defineCloudAccountModel(db);
  models.Project = defineProjectModel(db);
  models.Deployment = defineDeploymentModel(db);
  models.Conversation = defineConversationModel(db);

  // Associations
  models.User.hasMany(models.CloudAccount, { foreignKey: 'userId' });
  models.CloudAccount.belongsTo(models.User, { foreignKey: 'userId' });

  models.User.hasMany(models.Project, { foreignKey: 'userId' });
  models.Project.belongsTo(models.User, { foreignKey: 'userId' });

  models.Project.hasMany(models.Deployment, { foreignKey: 'projectId' });
  models.Deployment.belongsTo(models.Project, { foreignKey: 'projectId' });

  models.User.hasMany(models.Conversation, { foreignKey: 'userId' });
  models.Conversation.belongsTo(models.User, { foreignKey: 'userId' });

  return models;
};

const getModels = () => models;

module.exports = { initModels, getModels };
