const Comment = require("../models/Comment");

async function createComment(req, res) {
  try {
    const comment = await Comment.create(req.body);
    return res.status(201).json(comment);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function getComments(req, res) {
  const comments = await Comment.find().sort({ createdAt: -1 });
  return res.json(comments);
}

async function getCommentById(req, res) {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment)
      return res.status(404).json({ error: "Comment not found" });

    return res.json(comment);
  } catch {
    return res.status(400).json({ error: "Invalid comment id" });
  }
}

async function updateComment(req, res) {
  try {
    const updated = await Comment.findByIdAndUpdate(
      req.params.commentId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated)
      return res.status(404).json({ error: "Comment not found" });

    return res.json(updated);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
}

async function deleteComment(req, res) {
  try {
    const deleted = await Comment.findByIdAndDelete(req.params.commentId);

    if (!deleted)
      return res.status(404).json({ error: "Comment not found" });

    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ error: "Invalid comment id" });
  }
}

module.exports = {
  createComment,
  getComments,
  getCommentById,
  updateComment,
  deleteComment,
};
