const Post = require("../models/Post");
const Comment = require("../models/Comment");

async function getAllPosts(req, res) {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    return res.json(posts);
  } catch (err) {
    console.error("Error getting posts:", err.message);
    return res.status(500).json({ error: "Failed to get posts" });
  }
}

async function getPostsBySender(req, res) {
  try {
    const { sender } = req.query;

    if (!sender) {
      return res
        .status(400)
        .json({ error: "sender query parameter is required" });
    }

    const posts = await Post.find({ senderId: sender }).sort({
      createdAt: -1,
    });
    return res.json(posts);
  } catch (err) {
    console.error("Error getting posts by sender:", err.message);
    return res.status(500).json({ error: "Failed to get posts by sender" });
  }
}

async function getPostById(req, res) {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    return res.json(post);
  } catch (err) {
    console.error("Error getting post by id:", err.message);
    return res.status(400).json({ error: "Invalid post id" });
  }
}

async function getCommentsByPost(req, res) {
  try {
    const { postId } = req.params;

    const comments = await Comment.collection
      .find({ postId })
      .sort({ createdAt: -1 })
      .toArray();

    return res.json(comments);
  } catch (e) {
    return res.status(500).json({ error: "Failed to get comments" });
  }
}

async function createPost(req, res) {
  try {
    const { senderId, title, content } = req.body;

    if (!senderId || !title || !content) {
      return res
        .status(400)
        .json({ error: "senderId, title and content are required" });
    }

    const post = await Post.create({ senderId, title, content });
    return res.status(201).json(post);
  } catch (err) {
    console.error("Error creating post:", err.message);
    return res.status(500).json({ error: "Failed to create post" });
  }
}

async function updatePost(req, res) {
  try {
    const { senderId, title, content } = req.body;

    if (!senderId || !title || !content) {
      return res
        .status(400)
        .json({ error: "senderId, title and content are required" });
    }

    const updated = await Post.findByIdAndUpdate(
      req.params.postId,
      { senderId, title, content },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Post not found" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("Error updating post:", err.message);
    return res.status(500).json({ error: "Failed to update post" });
  }
}

module.exports = {
  getAllPosts,
  getPostsBySender,
  getCommentsByPost,
  getPostById,
  createPost,
  updatePost,
};
