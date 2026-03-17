import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Comment } from "../models/Comment";
import { IPost, Post } from "../models/Post";
import { PostLike } from "../models/PostLike";
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
      image: post.image ?? null,
      likes,
    };
  }

  async searchPosts(req: Request, res: Response) {
    try {
      const details: Record<string, string> = {};
      const rawQuery = req.body?.query;
      const query = typeof rawQuery === "string" ? rawQuery.trim() : "";

      if (!query) {
        details.query = "query is required";
      } else if (query.length > 500) {
        details.query = "query must be at most 500 characters";
      }

      const rawPage = req.body?.page;
      const rawLimit = req.body?.limit;

      const page =
        rawPage === undefined ? 1 : Number.isInteger(rawPage) ? rawPage : NaN;
      const limit =
        rawLimit === undefined
          ? 20
          : Number.isInteger(rawLimit)
            ? rawLimit
            : NaN;

      if (!Number.isInteger(page) || page < 1) {
        details.page = "page must be an integer greater than or equal to 1";
      }

      if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
        details.limit = "limit must be between 1 and 50";
      }

      const filters =
        req.body?.filters && typeof req.body.filters === "object"
          ? req.body.filters
          : {};

      const createdBy =
        typeof filters.createdBy === "string" && filters.createdBy.trim()
          ? filters.createdBy.trim()
          : undefined;

      const dateFrom =
        typeof filters.dateFrom === "string"
          ? new Date(filters.dateFrom)
          : undefined;
      const dateTo =
        typeof filters.dateTo === "string"
          ? new Date(filters.dateTo)
          : undefined;

      if (dateFrom && Number.isNaN(dateFrom.getTime())) {
        details.dateFrom = "dateFrom must be a valid ISO date";
      }

      if (dateTo && Number.isNaN(dateTo.getTime())) {
        details.dateTo = "dateTo must be a valid ISO date";
      }

      if (
        dateFrom &&
        dateTo &&
        !Number.isNaN(dateFrom.getTime()) &&
        !Number.isNaN(dateTo.getTime()) &&
        dateFrom > dateTo
      ) {
        details.dateRange = "dateFrom must be earlier than or equal to dateTo";
      }

      if (Object.keys(details).length > 0) {
        return res.status(400).json({ error: "Invalid request", details });
      }

      const sort = req.body?.sort === "newest" ? "newest" : "relevance";

      const regex = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );

      const filter: Record<string, unknown> = {
        $or: [{ title: regex }, { content: regex }],
      };

      if (createdBy) {
        filter.createdBy = createdBy;
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {
          ...(dateFrom ? { $gte: dateFrom } : {}),
          ...(dateTo ? { $lte: dateTo } : {}),
        };
      }

      const sortSpec = { createdAt: -1 };
      const skip = (page - 1) * limit;

      const [posts, total] = await Promise.all([
        this.model.find(filter).sort(sortSpec).skip(skip).limit(limit),
        this.model.countDocuments(filter),
      ]);

      const postIds = posts.map((post: IPost & { id: string }) => post.id);
      const likesByPostId = await this.buildLikesMap(postIds);

      const items = posts.map((post: IPost & { id: string } & any) => ({
        ...this.serializePost(post, likesByPostId.get(post.id) ?? []),
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      }));

      return res.json({
        items,
        page,
        limit,
        total,
        hasMore: page * limit < total,
        meta: {
          fallbackUsed: true,
          sortApplied: sort,
          filtersApplied: {
            ...(createdBy ? { createdBy } : {}),
            ...(dateFrom ? { dateFrom: dateFrom.toISOString() } : {}),
            ...(dateTo ? { dateTo: dateTo.toISOString() } : {}),
          },
          parsedIntent: {
            keywords: query.split(/\s+/).filter(Boolean),
            mustInclude: [],
            exclude: [],
            createdBy: createdBy ?? null,
            dateFrom: dateFrom ? dateFrom.toISOString() : null,
            dateTo: dateTo ? dateTo.toISOString() : null,
            sortBy: sort,
          },
        },
      });
    } catch (err) {
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
      await PostLike.deleteMany({ postId: req.params.postId });

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
