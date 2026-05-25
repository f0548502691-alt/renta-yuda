const path = require("path");
const express = require("express");
const session = require("express-session");
const publicRoutes = require("./routes/publicRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { renderNotFound } = require("./controllers/publicController");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

// Client layer (views + static assets) is intentionally kept separate from the API/business layers.
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-in-production",
    resave: false,
    saveUninitialized: false,
  })
);

app.locals.formatDate = (dateText) =>
  new Date(dateText).toLocaleString("he-IL", { hour12: false });

app.locals.formatCurrency = (value) =>
  Number(value).toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 0,
  });

app.use(publicRoutes);
app.use(adminRoutes);
app.use(renderNotFound);

module.exports = app;
