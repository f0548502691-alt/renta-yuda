const mongoose = require("mongoose");

const apartmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    neighborhood: { type: String, required: true, trim: true },
    neighborhood_normalized: { type: String, required: true, trim: true, index: true },
    rooms: { type: Number, required: true, min: 1, index: true },
    price: { type: Number, required: true, min: 0, index: true },
    address: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    contact_name: { type: String, default: "", trim: true },
    contact_phone: { type: String, default: "", trim: true },
    contact_email: { type: String, default: "", trim: true, lowercase: true },
    source: { type: String, default: "admin", enum: ["admin", "guest"] },
    active: { type: Boolean, default: true, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
  }
);

apartmentSchema.index({ active: 1, rooms: 1, neighborhood_normalized: 1 });
apartmentSchema.index({ active: 1, created_at: -1 });

module.exports = mongoose.models.Apartment || mongoose.model("Apartment", apartmentSchema);
