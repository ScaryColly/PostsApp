import type { Express } from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import intApp from "../index";
import { Comment } from "../models/Comment";
import { Post } from "../models/Post";
import { PostLike } from "../models/PostLike";
import { User } from "../models/User";

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

    const res = await request(app).delete("/posts/" + id);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const deletedPost = await Post.findById(id);
    expect(deletedPost).toBeNull();
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
});
