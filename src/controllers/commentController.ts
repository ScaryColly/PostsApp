// src/controllers/commentController.ts
import { Request, Response } from "express";
import BaseController from "./baseController";
import Comment from "../models/Comment";

class CommentController extends BaseController {
  constructor() {
    super(Comment);
  }

  async createComment(req: Request, res: Response) {
    try {
      const comment = await super.post(req);
      return res.status(201).json(comment);
    } catch (e) {
      return res.status(400).json({ error: (e as Error).message });
    }
  }

  async getComments(req: Request, res: Response) {
    const comments = await super.get(req);
    return res.json(comments);
  }

  async getCommentById(req: Request, res: Response) {
    try {
      req.params.id = req.params.commentId; 
      const comment = await super.getById(req);

      if (!comment) return res.status(404).json({ error: "Comment not found" });
      return res.json(comment);
    } catch {
      return res.status(400).json({ error: "Invalid comment id" });
    }
  }

  async updateComment(req: Request, res: Response) {
    try {
      req.params.id = req.params.commentId; 
      const updated = await super.put(req);

      if (!updated) return res.status(404).json({ error: "Comment not found" });
      return res.json(updated);
    } catch (e) {
      return res.status(400).json({ error: (e as Error).message });
    }
  }

  async deleteComment(req: Request, res: Response) {
    try {
      req.params.id = req.params.commentId; 
      const deleted = await super.del(req);

      if (!deleted) return res.status(404).json({ error: "Comment not found" });
      return res.json({ ok: true });
    } catch {
      return res.status(400).json({ error: "Invalid comment id" });
    }
  }
}

export default new CommentController();
