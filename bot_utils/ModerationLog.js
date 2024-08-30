// models/ModerationLog.js
const mongoose = require("mongoose");

const moderationLogSchema = new mongoose.Schema({
  logNumber: { type: Number, required: false, unique: true },
  duration: { type: Number, required: false },
  action: { type: String, required: true },
  moderator: { type: String, required: true },
  user: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Auto-increment logNumber
moderationLogSchema.pre("save", async function (next) {
  if (this.isNew) {
    const highestLog = await this.constructor.findOne().sort("-logNumber");
    console.log("Highest Log:", highestLog); // Debugging log
    this.logNumber = highestLog ? highestLog.logNumber + 1 : 1;
    console.log("Assigned Log Number:", this.logNumber); // Debugging log
  }
  next();
});

module.exports = mongoose.model("ModerationLog", moderationLogSchema);
