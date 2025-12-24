const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const Comment = require("../models/Comment");




router.get("/", async (req, res) => {
    const { sender } = req.query;
    const filter = sender ? { senderId: sender } : {};
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    return res.json(posts);
});

router.get("/:postId", async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ error: "Post not found" });
        return res.json(post);
    } catch {
        return res.status(400).json({ error: "Invalid post id" });
    }
});

module.exports = router;