const mongoose = require("mongoose");

const newsletterLogSchema = new mongoose.Schema(
  {
    search_request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    apartments_count: { type: Number, required: true, min: 0 },
    sent_at: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
  }
);

newsletterLogSchema.index({ sent_at: -1 });

module.exports =
  mongoose.models.NewsletterLog || mongoose.model("NewsletterLog", newsletterLogSchema);
