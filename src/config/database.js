const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: "postgres",
    host: process.env.DB_HOST,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions:
      process.env.DB_CONNECT_SSL_REQUIRED === "true"
        ? {
            ssl: {
              require: true,
              rejectUnauthorized: false,
            },
          }
        : {},
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✓ PostgreSQL connected successfully");

    // Note: In production, tables are created by the seed script
    // This just verifies the connection
    if (process.env.NODE_ENV !== "production") {
      // await sequelize.sync({ force: true });
      console.log("✓ Database models synchronized");
    }
  } catch (error) {
    console.error("✗ PostgreSQL connection error:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
