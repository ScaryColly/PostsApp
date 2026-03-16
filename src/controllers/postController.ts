import { Request, Response } from "express";
import { Comment } from "../models/Comment";
import { IPost, Post } from "../models/Post";
import BaseController from "./baseController";

class PostController extends BaseController {
  constructor() {
    super(Post);
  }

  async getAllPosts(req: Request, res: Response) {
    try {
      const posts = await this.model
        .find(req.query || {})
        .populate("createdBy", "username email")
        .sort({ createdAt: -1 });
      const transformedPosts = posts.map((post: IPost & { id: string }) => ({
        id: post.id,
        title: post.title,
        content: post.content,
        createdBy: post.createdBy,
      }));
      return res.json(transformedPosts);
    } catch (err) {
      console.error("תקלה בשליפת הפוסטים:", (err as Error).message);
      return res.status(500).json({ error: "לא הצלחנו להביא את הפוסטים" });
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

      const posts = await this.model
        .find({ createdBy: sender })
        .populate("createdBy", "username email")
        .sort({
          createdAt: -1,
        });
      return res.json(posts);
    } catch (err) {
      console.error("תקלה בשליפת הפוסטים לפי שליח:", (err as Error).message);
      return res
        .status(500)
        .json({ error: "לא הצלחנו להביא את הפוסטים לפי שליח" });
    }
  }

  async getPostById(req: Request, res: Response) {
    try {
      const post = await this.model
        .findById(req.params.postId)
        .populate("createdBy", "username email");

      if (!post) return res.status(404).json({ error: "Post not found" });
      return res.json(post);
    } catch (err) {
      console.error("תקלה בשליפת הפוסט לפי ID:", (err as Error).message);
      return res.status(400).json({ error: "תקלה בשליפת הפוסט לפי ID" });
    }
  }

  async getCommentsByPost(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      const comments = await Comment.find({ postId })
        .populate("createdBy", "-password -refreshTokens")
        .sort({ createdAt: -1 });

      return res.json(comments);
    } catch {
      return res.status(500).json({ error: "Failed to get comments" });
    }
  }

  async createPost(req: Request, res: Response) {
    try {
      const { createdBy, title, content } = req.body;

      if (!createdBy || !title || !content) {
        return res
          .status(400)
          .json({ error: "createdBy, title and content are required" });
      }

      req.body = { createdBy, title, content };

      const post = await super.post(req);
      return res.status(201).json(post);
    } catch (err) {
      console.error("תקלה ביצירת הפוסט:", (err as Error).message);
      return res.status(500).json({ error: "לא הצלחנו ליצור את הפוסט" });
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const { createdBy, title, content } = req.body;

      if (!createdBy || !title || !content) {
        return res
          .status(400)
          .json({ error: "createdBy, title and content are required" });
      }

      req.params.id = req.params.postId;
      req.body = { createdBy, title, content };

      const updated = await super.put(req);

      if (!updated) return res.status(404).json({ error: "Post not found" });
      return res.json(updated);
    } catch (err) {
      console.error("תקלה בעדכון הפוסט:", (err as Error).message);
      return res.status(500).json({ error: "לא הצלחנו לעדכן את הפוסט" });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      req.params.id = req.params.postId;
      const deleted = await super.del(req);

      if (!deleted) return res.status(404).json({ error: "Post not found" });
      return res.json({ ok: true });
    } catch (err) {
      console.error("תקלה במחיקת הפוסט:", (err as Error).message);
      return res.status(400).json({ error: "Invalid post id" });
    }
  }
}

export default new PostController();
