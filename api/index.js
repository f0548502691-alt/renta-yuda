const app = require("../src/app");
const { connectToDatabase } = require("../src/db");

connectToDatabase().catch((error) => {
  console.error("MongoDB connection failed in serverless runtime:", error);
});

module.exports = app;
