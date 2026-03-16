import type { Express } from "express";
import request from "supertest";
import intApp from "../index";
import { Comment } from "../models/Comment";
import { Post } from "../models/Post";
import { User } from "../models/User";

type PostSeed = {
  createdBy: string;
  title: string;
  content: string;
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
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await User.deleteMany({});
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

  test("GET /posts - after insert", async () => {
    const res = await request(app).get("/posts");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(postsData.length);
  });

  test("GET /posts?sender=<userId> - filter", async () => {
    const res = await request(app).get(`/posts?sender=${user1Id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
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

  test("DELETE /posts/:postId - delete", async () => {
    const id = postsData[2]._id!;

    const res = await request(app).delete("/posts/" + id);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const deletedPost = await Post.findById(id);
    expect(deletedPost).toBeNull();
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
        senderId: "user1",
        message: "first",
        createdAt: new Date("2020-01-01"),
      },
      {
        postId,
        senderId: "user1",
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
  });
});
