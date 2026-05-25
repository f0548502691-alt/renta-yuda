const app = require("./app");
const { scheduleNewsletter } = require("./newsletterScheduler");

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  scheduleNewsletter();
  console.log(`Server is running on http://localhost:${port}`);
});
