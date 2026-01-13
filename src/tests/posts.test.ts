import request from "supertest";
import intApp from "../index";

import Post from "../models/Post";
import Comment from "../models/Comment";
import type { Express } from "express";
import { postsData } from "./testsUtils";

let app: Express;

beforeAll(async () => {
  app = await intApp();

  await Post.deleteMany({});
  await Comment.deleteMany({});
});

afterAll(async () => {
  await Comment.deleteMany({});
  await Post.deleteMany({});
});

describe("Posts API", () => {
  test("GET /post - empty db", async () => {
    const res = await request(app).get("/post");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("POST /post - missing fields => 400", async () => {
    const res = await request(app).post("/post").send({ title: "x" });
    expect(res.statusCode).toBe(400);
  });

  test("POST /post - create posts", async () => {
    for (const post of postsData) {
      const res = await request(app).post("/post").send(post);
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject(post);
      post._id = res.body._id;
    }
  });

  test("GET /post - after insert", async () => {
    const res = await request(app).get("/post");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(postsData.length);
  });

  test("GET /post?sender=user1 - filter", async () => {
    const res = await request(app).get("/post?sender=user1");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    for (const p of res.body) {
      expect(p.senderId).toBe("user1");
    }
  });

  test("GET /post/:postId - get by id", async () => {
    const id = postsData[0]._id!;
    const res = await request(app).get("/post/" + id);
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(id);
  });

  test("PUT /post/:postId - update", async () => {
    const id = postsData[0]._id!;
    const updated = {
      senderId: "user1",
      title: "UPDATED",
      content: "UPDATED CONTENT",
    };

    const res = await request(app).put("/post/" + id).send(updated);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe(updated.title);
  });

  test("GET /post/:postId/comments - empty", async () => {
    const postId = postsData[1]._id!;
    const res = await request(app).get(`/post/${postId}/comments`);
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

    const res = await request(app).get(`/post/${postId}/comments`);
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0].message).toBe("second");
    expect(res.body[1].message).toBe("first");
  });
});
