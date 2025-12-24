const express = require("express");
const router = express.Router();
const Comment = require("../models/Comment");

router.post("/", async (req, res) => {
    try {
        const comment = await Comment.create(req.body);
        return res.status(201).json(comment);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

router.get("/", async (req, res) => {
    const comments = await Comment.find().sort({ createdAt: -1 });
    return res.json(comments);
});

router.get("/:commentId", async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) return res.status(404).json({ error: "Comment not found" });
        return res.json(comment);
    } catch {
        return res.status(400).json({ error: "Invalid comment id" });
    }
});

router.put("/:commentId", async (req, res) => {
    try {
        const updated = await Comment.findByIdAndUpdate(
            req.params.commentId,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ error: "Comment not found" });
        return res.json(updated);
    } catch (e) {
        return res.status(400).json({ error: e.message });
    }
});

router.delete("/:commentId", async (req, res) => {
    try {
        const deleted = await Comment.findByIdAndDelete(req.params.commentId);
        if (!deleted) return res.status(404).json({ error: "Comment not found" });
        return res.json({ ok: true });
    } catch {
        return res.status(400).json({ error: "Invalid comment id" });
    }
});

module.exports = router;