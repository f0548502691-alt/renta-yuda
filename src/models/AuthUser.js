const mongoose = require("mongoose");

const authUserSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password_hash: { type: String, default: null },
    password_salt: { type: String, default: null },
    google_id: { type: String, default: null, sparse: true, index: true },
    providers: { type: [String], default: [] },
    created_at: { type: Date, default: Date.now, index: true },
    last_login_at: { type: Date, default: null },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.models.AuthUser || mongoose.model("AuthUser", authUserSchema);
