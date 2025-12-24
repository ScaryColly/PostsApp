const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);