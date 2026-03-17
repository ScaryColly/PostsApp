import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Comment } from "../models/Comment";
import { IPost, Post } from "../models/Post";
import { PostLike } from "../models/PostLike";
import {
  searchPosts as searchPostsService,
  SearchValidationError,
} from "../services/postSearchService";
import BaseController from "./baseController";

class PostController extends BaseController {
  constructor() {
    super(Post);
  }

  private removePostImage(image?: string | null) {
    if (!image || !image.startsWith("/uploads/posts/")) {
      return;
    }

    const absolutePath = path.join(
      process.cwd(),
      image.startsWith("/") ? image.slice(1) : image,
    );

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  private async buildLikesMap(postIds: string[]) {
    if (postIds.length === 0) {
      return new Map<string, string[]>();
    }

    const likes = await PostLike.find({ postId: { $in: postIds } }).select(
      "postId userId -_id",
    );

    const likesByPostId = new Map<string, string[]>(
      postIds.map((postId) => [postId, []]),
    );

    for (const like of likes as Array<{ postId: string; userId: string }>) {
      likesByPostId.get(String(like.postId))?.push(String(like.userId));
    }

    return likesByPostId;
  }

  private serializePost(
    post: IPost & { id: string; _id?: string },
    likes: string[],
  ) {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      createdBy: post.createdBy,
      createdAt: post.createdAt,
      image: post.image ?? null,
      likes,
    };
  }

  async searchPosts(req: Request, res: Response) {
    try {
      const result = await searchPostsService(req.body, {
        model: this.model,
        buildLikesMap: this.buildLikesMap.bind(this),
        serializePost: this.serializePost.bind(this),
      });

      return res.json(result);
    } catch (err) {
      if (err instanceof SearchValidationError) {
        return res
          .status(400)
          .json({ error: "Invalid request", details: err.details });
      }

      console.error("Failed to search posts:", (err as Error).message);
      return res.status(500).json({ error: "Failed to search posts" });
    }
  }

  async getAllPosts(req: Request, res: Response) {
    try {
      const posts = await this.model.find(req.query || {}).sort({
        createdAt: -1,
      });

      const postIds = posts.map((post: IPost & { id: string }) => post.id);
      const likesByPostId = await this.buildLikesMap(postIds);

      const transformedPosts = posts.map((post: IPost & { id: string }) =>
        this.serializePost(post, likesByPostId.get(post.id) ?? []),
      );

      return res.json(transformedPosts);
    } catch (err) {
      console.error("תקלה בשליפת הפוסטים:", (err as Error).message);
      return res.status(500).json({ error: "לא הצלחנו להביא את הפוסטים" });
    }
  }

  getPosts(req: Request, res: Response) {
    if (req.query.createdBy) {
      return this.getPostsByCreatedBy(req, res);
    }

    return this.getAllPosts(req, res);
  }

  async getPostsByCreatedBy(req: Request, res: Response) {
    try {
      const { createdBy } = req.query;

      if (!createdBy) {
        return res
          .status(400)
          .json({ error: "createdBy query parameter is required" });
      }

      const posts = await this.model.find({ createdBy }).sort({
        createdAt: -1,
      });

      const postIds = posts.map((post: IPost & { id: string }) => post.id);
      const likesByPostId = await this.buildLikesMap(postIds);

      return res.json(
        posts.map((post: IPost & { id: string }) =>
          this.serializePost(post, likesByPostId.get(post.id) ?? []),
        ),
      );
    } catch (err) {
      console.error("תקלה בשליפת הפוסטים לפי שליח:", (err as Error).message);
      return res
        .status(500)
        .json({ error: "לא הצלחנו להביא את הפוסטים לפי שליח" });
    }
  }

  async getPostById(req: Request, res: Response) {
    try {
      const post = await this.model.findById(req.params.postId);

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      const postId = post.id;
      const likesByPostId = await this.buildLikesMap([postId]);

      return res.json({
        ...post.toJSON(),
        image: post.image ?? null,
        likes: likesByPostId.get(postId) ?? [],
      });
    } catch (err) {
      console.error("תקלה בשליפת הפוסט לפי ID:", (err as Error).message);
      return res.status(400).json({ error: "תקלה בשליפת הפוסט לפי ID" });
    }
  }

  async getCommentsByPost(req: Request, res: Response) {
    try {
      const { postId } = req.params;

      const comments = await Comment.find({ postId }).sort({ createdAt: -1 });

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

      const image = req.file ? `/uploads/posts/${req.file.filename}` : null;

      req.body = { createdBy, title, content, image };

      const post = await super.post(req);
      return res.status(201).json(post);
    } catch (err) {
      if (req.file) {
        this.removePostImage(`/uploads/posts/${req.file.filename}`);
      }

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

      const existingPost = await this.model.findById(req.params.postId);

      if (!existingPost) {
        if (req.file) {
          this.removePostImage(`/uploads/posts/${req.file.filename}`);
        }

        return res.status(404).json({ error: "Post not found" });
      }

      const previousImage = existingPost.image ?? null;
      const image = req.file
        ? `/uploads/posts/${req.file.filename}`
        : previousImage;

      req.params.id = req.params.postId;
      req.body = { createdBy, title, content, image };

      const updated = await super.put(req);

      if (!updated) {
        return res.status(404).json({ error: "Post not found" });
      }

      if (req.file && previousImage) {
        this.removePostImage(previousImage);
      }

      return res.json(updated);
    } catch (err) {
      if (req.file) {
        this.removePostImage(`/uploads/posts/${req.file.filename}`);
      }

      console.error("תקלה בעדכון הפוסט:", (err as Error).message);
      return res.status(500).json({ error: "לא הצלחנו לעדכן את הפוסט" });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      req.params.id = req.params.postId;
      const deleted = await super.del(req);

      if (!deleted) {
        return res.status(404).json({ error: "Post not found" });
      }

      this.removePostImage((deleted as IPost).image ?? null);
      await Promise.all([
        Comment.deleteMany({ postId: req.params.postId }),
        PostLike.deleteMany({ postId: req.params.postId }),
      ]);

      return res.json({ ok: true });
    } catch (err) {
      console.error("תקלה במחיקת הפוסט:", (err as Error).message);
      return res.status(400).json({ error: "Invalid post id" });
    }
  }

  async likePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const postExists = await this.model.findById(postId);
      if (!postExists) {
        return res.status(404).json({ error: "Post not found" });
      }

      await PostLike.updateOne(
        { postId, userId },
        { $setOnInsert: { postId, userId } },
        { upsert: true },
      );

      const likes = await PostLike.find({ postId }).select("userId -_id");

      return res.json({
        ok: true,
        likes: likes.map((like: { userId: string }) => String(like.userId)),
      });
    } catch (err) {
      console.error("תקלה בלייק לפוסט:", (err as Error).message);
      return res.status(400).json({ error: "Invalid post id" });
    }
  }

  async unlikePost(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const postExists = await this.model.findById(postId);
      if (!postExists) {
        return res.status(404).json({ error: "Post not found" });
      }

      await PostLike.deleteOne({ postId, userId });

      const likes = await PostLike.find({ postId }).select("userId -_id");

      return res.json({
        ok: true,
        likes: likes.map((like: { userId: string }) => String(like.userId)),
      });
    } catch (err) {
      console.error("תקלה בהסרת לייק מפוסט:", (err as Error).message);
      return res.status(400).json({ error: "Invalid post id" });
    }
  }
}

export default new PostController();
