import type { Express } from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import intApp from "../index";
import { generateAccessToken } from "../middleware/auth";
import { Comment } from "../models/Comment";
import { Post } from "../models/Post";
import { PostLike } from "../models/PostLike";
import { User } from "../models/User";
import * as llmPostSearchParser from "../services/llmPostSearchParser";

type PostSeed = {
  createdBy: string;
  title: string;
  content: string;
  image?: string | null;
  _id?: string;
};

let app: Express;
let postsData: PostSeed[] = [];
let user1Id: string;
let searchAccessToken: string;

beforeAll(async () => {
  app = await intApp();

  await User.deleteMany({});
  await Post.deleteMany({});
  await Comment.deleteMany({});
  await PostLike.deleteMany({});

  const user1 = await User.create({
    username: "post_user_1",
    email: "post_user_1@example.com",
    password: "password123",
  });
  const user2 = await User.create({
    username: "post_user_2",
    email: "post_user_2@example.com",
    password: "password123",
  });

  user1Id = String(user1._id);
  searchAccessToken = generateAccessToken(user1Id);
  const user2Id = String(user2._id);

  postsData = [
    { createdBy: user1Id, title: "Post A", content: "Content A" },
    { createdBy: user1Id, title: "Post B", content: "Content B" },
    { createdBy: user2Id, title: "Post C", content: "Content C" },
  ];
});

afterAll(async () => {
  await PostLike.deleteMany({});
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await User.deleteMany({});

  const postsUploadsDir = path.join(process.cwd(), "uploads", "posts");
  if (fs.existsSync(postsUploadsDir)) {
    fs.rmSync(postsUploadsDir, { recursive: true, force: true });
  }
});

describe("Posts API", () => {
  test("GET /posts - empty db", async () => {
    const res = await request(app).get("/posts");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("POST /posts - missing fields => 400", async () => {
    const res = await request(app).post("/posts").send({ title: "x" });
    expect(res.statusCode).toBe(400);
  });

  test("POST /posts - create posts", async () => {
    for (const post of postsData) {
      const res = await request(app).post("/posts").send(post);
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject({
        createdBy: post.createdBy,
        title: post.title,
        content: post.content,
      });
      expect(Number.isNaN(Date.parse(res.body.createdAt))).toBe(false);
      expect(res.body.updatedAt).toBeUndefined();
      post._id = res.body._id;
    }
  });

  test("POST /posts - create post with image", async () => {
    const res = await request(app)
      .post("/posts")
      .field("createdBy", user1Id)
      .field("title", "Post With Image")
      .field("content", "Content With Image")
      .attach("image", Buffer.from("fake image content"), "post-image.png");

    expect(res.statusCode).toBe(201);
    expect(res.body.image).toMatch(/^\/uploads\/posts\/.+\.png$/);

    const savedPath = path.join(process.cwd(), res.body.image.slice(1));
    expect(fs.existsSync(savedPath)).toBe(true);
  });

  test("GET /posts - after insert", async () => {
    const res = await request(app).get("/posts");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(postsData.length + 1);
    expect(res.body[0].likes).toEqual([]);
    expect(Number.isNaN(Date.parse(res.body[0].createdAt))).toBe(false);
  });

  test("GET /posts?createdBy=<userId> - filter", async () => {
    const res = await request(app).get(`/posts?createdBy=${user1Id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(3);
    for (const p of res.body) {
      const creatorId =
        typeof p.createdBy === "string" ? p.createdBy : p.createdBy._id;
      expect(String(creatorId)).toBe(user1Id);
    }
  });

  test("GET /posts/:postId - get by id", async () => {
    const id = postsData[0]._id!;
    const res = await request(app).get("/posts/" + id);
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(id);
    expect(res.body.likes).toEqual([]);
    expect(res.body.updatedAt).toBeUndefined();
  });

  test("POST /posts/:postId/like - missing userId => 400", async () => {
    const id = postsData[0]._id!;
    const res = await request(app).post(`/posts/${id}/like`);
    expect(res.statusCode).toBe(400);
  });

  test("POST /posts/:postId/like - like post", async () => {
    const id = postsData[0]._id!;

    const res = await request(app)
      .post(`/posts/${id}/like`)
      .send({ userId: user1Id });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, likes: [user1Id] });

    const likesInDb = await PostLike.countDocuments({
      postId: id,
      userId: user1Id,
    });
    expect(likesInDb).toBe(1);
  });

  test("POST /posts/:postId/like - duplicate like is idempotent", async () => {
    const id = postsData[0]._id!;

    const res = await request(app)
      .post(`/posts/${id}/like`)
      .send({ userId: user1Id });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, likes: [user1Id] });

    const likesInDb = await PostLike.countDocuments({
      postId: id,
      userId: user1Id,
    });
    expect(likesInDb).toBe(1);
  });

  test("GET /posts/:postId - includes likes array", async () => {
    const id = postsData[0]._id!;
    const res = await request(app).get(`/posts/${id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.likes).toEqual([user1Id]);
  });

  test("GET /posts - includes likes array", async () => {
    const id = postsData[0]._id!;
    const res = await request(app).get("/posts");

    expect(res.statusCode).toBe(200);
    const likedPost = res.body.find(
      (post: any) =>
        post.id === id || post._id === id || post.title === "Post A",
    );
    expect(likedPost).toBeDefined();
    expect(likedPost.likes).toEqual([user1Id]);
  });

  test("DELETE /posts/:postId/like - unlike post", async () => {
    const id = postsData[0]._id!;

    const res = await request(app)
      .delete(`/posts/${id}/like`)
      .send({ userId: user1Id });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true, likes: [] });

    const likesInDb = await PostLike.countDocuments({
      postId: id,
      userId: user1Id,
    });
    expect(likesInDb).toBe(0);
  });

  test("PUT /posts/:postId - update", async () => {
    const id = postsData[0]._id!;
    const updated = {
      createdBy: user1Id,
      title: "UPDATED",
      content: "UPDATED CONTENT",
    };

    const res = await request(app)
      .put("/posts/" + id)
      .send(updated);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe(updated.title);
  });

  test("PUT /posts/:postId - update image", async () => {
    const postWithImage = await Post.findOne({ title: "Post With Image" });
    const id = String(postWithImage?._id);
    const oldImage = postWithImage?.image;

    expect(id).toBeTruthy();
    expect(oldImage).toBeTruthy();

    const res = await request(app)
      .put(`/posts/${id}`)
      .field("createdBy", user1Id)
      .field("title", "Post With Image Updated")
      .field("content", "Content With Image Updated")
      .attach("image", Buffer.from("new fake image"), "updated-post-image.jpg");

    expect(res.statusCode).toBe(200);
    expect(res.body.image).toMatch(/^\/uploads\/posts\/.+\.jpg$/);
    expect(res.body.image).not.toBe(oldImage);

    const oldImagePath = path.join(process.cwd(), String(oldImage).slice(1));
    const newImagePath = path.join(process.cwd(), res.body.image.slice(1));

    expect(fs.existsSync(oldImagePath)).toBe(false);
    expect(fs.existsSync(newImagePath)).toBe(true);
  });

  test("DELETE /posts/:postId - delete", async () => {
    const id = postsData[2]._id!;

    await Comment.create({
      postId: id,
      createdBy: user1Id,
      message: "comment to delete with post",
    });
    await PostLike.create({ postId: id, userId: user1Id });

    const res = await request(app).delete("/posts/" + id);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const deletedPost = await Post.findById(id);
    const deletedComments = await Comment.countDocuments({ postId: id });
    const deletedLikes = await PostLike.countDocuments({ postId: id });

    expect(deletedPost).toBeNull();
    expect(deletedComments).toBe(0);
    expect(deletedLikes).toBe(0);
  });

  test("DELETE /posts/:postId - delete post with image removes file", async () => {
    const postWithImage = await Post.findOne({
      title: "Post With Image Updated",
    });
    const id = String(postWithImage?._id);
    const image = postWithImage?.image;

    expect(id).toBeTruthy();
    expect(image).toBeTruthy();

    const imagePath = path.join(process.cwd(), String(image).slice(1));
    expect(fs.existsSync(imagePath)).toBe(true);

    const res = await request(app).delete(`/posts/${id}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(fs.existsSync(imagePath)).toBe(false);
  });

  test("GET /posts/:postId/comments - empty", async () => {
    const postId = postsData[1]._id!;
    const res = await request(app).get(`/posts/${postId}/comments`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("GET /post/:postId/comments - after insert", async () => {
    const postId = String(postsData[1]._id);

    await Comment.collection.insertMany([
      {
        postId,
        createdBy: user1Id,
        message: "first",
        createdAt: new Date("2020-01-01"),
      },
      {
        postId,
        createdBy: user1Id,
        message: "second",
        createdAt: new Date("2021-01-01"),
      },
    ]);

    const rawInDb = await Comment.collection.find({ postId }).toArray();
    expect(rawInDb.length).toBe(2);

    const res = await request(app).get(`/posts/${postId}/comments`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].message).toBe("second");
    expect(res.body[1].message).toBe("first");
    expect(String(res.body[0].createdBy)).toBe(user1Id);
  });

  describe("POST /posts/search", () => {
    test("rejects unauthenticated request with 401", async () => {
      const res = await request(app)
        .post("/posts/search")
        .send({ query: "post" });

      expect(res.statusCode).toBe(401);
    });

    test("rejects missing query with 400 and details", async () => {
      const res = await request(app)
        .post("/posts/search")
        .set("Authorization", `Bearer ${searchAccessToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Invalid request");
      expect(res.body.details).toBeDefined();
      expect(typeof res.body.details.query).toBe("string");
    });

    test("rejects whitespace-only query with 400", async () => {
      const res = await request(app)
        .post("/posts/search")
        .set("Authorization", `Bearer ${searchAccessToken}`)
        .send({ query: "    " });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Invalid request");
      expect(res.body.details).toBeDefined();
      expect(typeof res.body.details.query).toBe("string");
    });

    test("applies default page and limit and returns stable response shape", async () => {
      const res = await request(app)
        .post("/posts/search")
        .set("Authorization", `Bearer ${searchAccessToken}`)
        .send({ query: "post" });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(20);
      expect(typeof res.body.total).toBe("number");
      expect(typeof res.body.hasMore).toBe("boolean");
      expect(res.body.meta).toBeDefined();
      expect(typeof res.body.meta.fallbackUsed).toBe("boolean");
    });

    test("rejects limit out of range with 400", async () => {
      const res = await request(app)
        .post("/posts/search")
        .set("Authorization", `Bearer ${searchAccessToken}`)
        .send({ query: "post", limit: 0 });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe("Invalid request");
      expect(res.body.details).toBeDefined();
      expect(typeof res.body.details.limit).toBe("string");
    });

    test("ignores legacy filters and sort without failing", async () => {
      const res = await request(app)
        .post("/posts/search")
        .set("Authorization", `Bearer ${searchAccessToken}`)
        .send({
          query: "post",
          sort: "newest",
          filters: {
            dateFrom: "2026-03-17T23:59:59.999Z",
            dateTo: "2026-03-01T00:00:00.000Z",
            createdBy: user1Id,
          },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.sortApplied).toBe("relevance");
      expect(res.body.meta.filtersApplied).toEqual({});
      expect(res.body.meta.parsedIntent.createdBy).toBeNull();
      expect(res.body.meta.parsedIntent.createdAt).toBeNull();
    });

    test("supports createdAt search intent for yesterday", async () => {
      const yesterdayIso = "2026-03-16T08:00:00.000Z";

      await Post.collection.insertMany([
        {
          createdBy: user1Id,
          title: "Yesterday match",
          content: "should be returned",
          image: null,
          createdAt: new Date("2026-03-16T12:00:00.000Z"),
        },
        {
          createdBy: user1Id,
          title: "Today post",
          content: "should not be returned",
          image: null,
          createdAt: new Date("2026-03-17T12:00:00.000Z"),
        },
      ]);

      jest
        .spyOn(llmPostSearchParser, "parseSearchIntentWithLlm")
        .mockResolvedValue({
          keywords: [],
          mustInclude: [],
          exclude: [],
          createdBy: null,
          createdAt: yesterdayIso,
          sortBy: "relevance",
        });

      const res = await request(app)
        .post("/posts/search")
        .set("Authorization", `Bearer ${searchAccessToken}`)
        .send({ query: "all posts from yesterday" });

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.parsedIntent.createdAt).toBe(yesterdayIso);
      expect(res.body.meta.filtersApplied).toEqual({ createdAt: yesterdayIso });
      expect(
        res.body.items.some((item: any) => item.title === "Yesterday match"),
      ).toBe(true);
      expect(
        res.body.items.some((item: any) => item.title === "Today post"),
      ).toBe(false);
    });

    test("returns all today's posts for Hebrew date-only query", async () => {
      const todayIso = "2026-03-17T07:00:00.000Z";

      await Post.collection.insertMany([
        {
          createdBy: user1Id,
          title: "Today Alpha",
          content: "first today item",
          image: null,
          createdAt: new Date("2026-03-17T09:00:00.000Z"),
        },
        {
          createdBy: user1Id,
          title: "Today Beta",
          content: "second today item",
          image: null,
          createdAt: new Date("2026-03-17T10:30:00.000Z"),
        },
      ]);

      jest
        .spyOn(llmPostSearchParser, "parseSearchIntentWithLlm")
        .mockResolvedValue({
          keywords: ["פורסם", "היום"],
          mustInclude: ["פורסם"],
          exclude: [],
          createdBy: null,
          createdAt: todayIso,
          sortBy: "relevance",
        });

      const res = await request(app)
        .post("/posts/search")
        .set("Authorization", `Bearer ${searchAccessToken}`)
        .send({ query: "מה שפורסם היום" });

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.parsedIntent.createdAt).toBe(todayIso);
      expect(res.body.meta.parsedIntent.keywords).toEqual([]);
      expect(
        res.body.items.some((item: any) => item.title === "Today Alpha"),
      ).toBe(true);
      expect(
        res.body.items.some((item: any) => item.title === "Today Beta"),
      ).toBe(true);
    });
  });
});
