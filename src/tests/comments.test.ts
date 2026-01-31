import request from "supertest";
import intApp from "../index";

import Comment from "../models/Comment";
import type { Express } from "express";
import { commentsData } from "./testsUtils";

let app: Express;

beforeAll(async () => {
  app = await intApp();
  await Comment.deleteMany({});
});

afterAll(async () => {
  await Comment.deleteMany({});
});

describe("Comments API", () => {
  test("GET /comments - empty db", async () => {
    const res = await request(app).get("/comments");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  test("POST /comments - create comments", async () => {
    for (const comment of commentsData) {
      const res = await request(app).post("/comments").send(comment);
      expect(res.statusCode).toBe(201);
      expect(res.body).toMatchObject(comment);
      comment._id = res.body._id;
    }
  });

  test("GET /comments - after insert", async () => {
    const res = await request(app).get("/comments");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(commentsData.length);
  });

  test("GET /comments/:commentId - get by id", async () => {
    const id = commentsData[0]._id!;
    const res = await request(app).get("/comments/" + id);
    expect(res.statusCode).toBe(200);
    expect(res.body._id).toBe(id);
  });

  test("PUT /comments/:commentId - update", async () => {
    const id = commentsData[0]._id!;
    const updated = {
      postId: commentsData[0].postId,
      senderId: commentsData[0].senderId,
      message: "UPDATED MESSAGE",
    };

    const res = await request(app).put("/comments/" + id).send(updated);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe(updated.message);
  });

  test("DELETE /comments/:commentId - delete", async () => {
    const id = commentsData[0]._id!;
    const res = await request(app).delete("/comments/" + id);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const check = await request(app).get("/comments/" + id);
    expect(check.statusCode).toBe(404);
  });

  test("GET /comments/:commentId - invalid id => 400", async () => {
    const res = await request(app).get("/comments/123");
    expect(res.statusCode).toBe(400);
  });
});
