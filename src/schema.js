const mongoose = require("mongoose");

const ratioSchema = new mongoose.Schema({
  message1: { type: String },
  message1Likes: { type: Number, default: 1 },
  message1Owner: {
    username: { type: String },
    avatar: { type: String },
    content: { type: String },
  },

  message2: { type: String },
  message2Likes: { type: Number, default: 1 },
  message2Owner: {
    username: { type: String },
    avatar: { type: String },
    content: { type: String },
  },

  time: { type: Number, default: Date.now() },
});

const ratio = mongoose.model("ratios", ratioSchema);

module.exports = ratio;
