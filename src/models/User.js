const mongoose = require("mongoose");

const searchCriteriaSchema = new mongoose.Schema(
  {
    preferred_rooms: { type: Number, required: true, min: 1 },
    preferred_neighborhood: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    search_criteria: { type: searchCriteriaSchema, required: true },
    access_token: { type: String, required: true, unique: true, index: true },
    is_paid: { type: Boolean, default: false, index: true },
    paid_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
  }
);

userSchema.index({
  "search_criteria.preferred_neighborhood": 1,
  "search_criteria.preferred_rooms": 1,
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
