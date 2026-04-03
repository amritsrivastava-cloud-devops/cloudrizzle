const { Sequelize } = require('sequelize');
const logger = require('./logger');

let sequelize;

const connectDB = async () => {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'cloudrizzle',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'password',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      pool: {
        max: 20,
        min: 2,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: process.env.DB_SSL === 'true' ? {
          require: true,
          rejectUnauthorized: false
        } : false
      }
    }
  );

  await sequelize.authenticate();
  logger.info('✅ PostgreSQL connected successfully');

  // Sync models in development
  if (process.env.NODE_ENV !== 'production') {
    await sequelize.sync({ alter: true });
    logger.info('✅ Database synced');
  }

  return sequelize;
};

const getDB = () => {
  if (!sequelize) throw new Error('Database not initialized');
  return sequelize;
};

module.exports = { connectDB, getDB, Sequelize };
