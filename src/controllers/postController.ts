import { Request, Response } from "express";
import BaseController from "./baseController";
import Post from "../models/Post";
import Comment from "../models/Comment";

class PostController extends BaseController {
  constructor() {
    super(Post);
  }

  async getAllPosts(req: Request, res: Response) {
    try {
      const posts = await super.get(req);
      return res.json(posts);
    } catch (err) {
      console.error("Error getting posts:", (err as Error).message);
      return res.status(500).json({ error: "Failed to get posts" });
    }
  }

  getPosts(req: Request, res: Response) {
    if (req.query.sender) {
      return this.getPostsBySender(req, res);
    }
    return this.getAllPosts(req, res);
  }

  async getPostsBySender(req: Request, res: Response) {
    try {
      const { sender } = req.query;

      if (!sender) {
        return res
          .status(400)
          .json({ error: "sender query parameter is required" });
      }

      const posts = await this.model.find({ senderId: sender }).sort({
        createdAt: -1,
      });
      return res.json(posts);
    } catch (err) {
      console.error("Error getting posts by sender:", (err as Error).message);
      return res.status(500).json({ error: "Failed to get posts by sender" });
    }
  }

  async getPostById(req: Request, res: Response) {
    try {
      req.params.id = req.params.postId;
      const post = await super.getById(req);

      if (!post) return res.status(404).json({ error: "Post not found" });
      return res.json(post);
    } catch (err) {
      console.error("Error getting post by id:", (err as Error).message);
      return res.status(400).json({ error: "Invalid post id" });
    }
  }

  async getCommentsByPost(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      const comments = await (Comment as any).collection
        .find({ postId })
        .sort({ createdAt: -1 })
        .toArray();

      return res.json(comments);
    } catch {
      return res.status(500).json({ error: "Failed to get comments" });
    }
  }

  async createPost(req: Request, res: Response) {
    try {
      const { senderId, title, content } = req.body;

      if (!senderId || !title || !content) {
        return res
          .status(400)
          .json({ error: "senderId, title and content are required" });
      }

      req.body = { senderId, title, content };

      const post = await super.post(req);
      return res.status(201).json(post);
    } catch (err) {
      console.error("Error creating post:", (err as Error).message);
      return res.status(500).json({ error: "Failed to create post" });
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const { senderId, title, content } = req.body;

      if (!senderId || !title || !content) {
        return res
          .status(400)
          .json({ error: "senderId, title and content are required" });
      }

      req.params.id = req.params.postId;
      req.body = { senderId, title, content };

      const updated = await super.put(req);

      if (!updated) return res.status(404).json({ error: "Post not found" });
      return res.json(updated);
    } catch (err) {
      console.error("Error updating post:", (err as Error).message);
      return res.status(500).json({ error: "Failed to update post" });
    }
  }
}

export default new PostController();
