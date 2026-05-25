const app = require("./app");
const { connectToDatabase } = require("./db");
const { scheduleNewsletter } = require("./newsletterScheduler");

const port = Number(process.env.PORT || 3000);

async function startServer() {
  await connectToDatabase();
  app.listen(port, () => {
    scheduleNewsletter();
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
