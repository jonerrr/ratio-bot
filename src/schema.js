const mongoose = require("mongoose");

const ratioSchema = new mongoose.Schema({
  _id: { type: String },
  likes: { type: Number },
  content: { type: String },
  message: { type: String },
  author: { type: String },
  link: { type: String },
  related: { type: String },
  time: { type: Number, default: Date.now() },
});

const ratio = mongoose.model("ratios", ratioSchema);

module.exports = ratio;
