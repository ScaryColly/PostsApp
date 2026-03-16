import request from "supertest";
import intApp from "../index";
import { User } from "../models/User";
import { Post } from "../models/Post";
import type { Express } from "express";

let app: Express;
let accessToken: string;
let refreshToken: string;
let userId: string;
let secondUserId: string;
let secondUserAccessToken: string;
let user: any;

const testUser = {
  username: "testuser",
  email: "test@example.com",
  password: "password123",
};

const testUser2 = {
  username: "testuser2",
  email: "test2@example.com",
  password: "password456",
};

beforeAll(async () => {
  app = await intApp();
  await User.deleteMany({});
  await Post.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await Post.deleteMany({});
});

describe("Users API", () => {
  describe("POST /users/register", () => {
    test("Register - missing fields => 400", async () => {
      const res = await request(app)
        .post("/users/register")
        .send({ username: "testuser" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Missing required fields");
    });

    test("Register - successful registration", async () => {
      const res = await request(app).post("/users/register").send(testUser);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("_id");
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body.username).toBe(testUser.username);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).toHaveProperty("profileImage");

      userId = res.body._id;
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      user = await User.findById(userId);
    });

    test("Register - duplicate email => 409", async () => {
      const res = await request(app).post("/users/register").send({
        username: "differentuser",
        email: testUser.email,
        password: "password123",
      });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain("already exists");
    });

    test("Register - duplicate username => 409", async () => {
      const res = await request(app).post("/users/register").send({
        username: testUser.username,
        email: "different@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(409);
      expect(res.body.error).toContain("already exists");
    });

    test("Register - second user", async () => {
      const res = await request(app).post("/users/register").send(testUser2);

      expect(res.statusCode).toBe(201);
      expect(res.body.username).toBe(testUser2.username);

      secondUserId = res.body._id;
      secondUserAccessToken = res.body.accessToken;
    });
  });

  describe("POST /users/login", () => {
    test("Login - missing fields => 400", async () => {
      const res = await request(app)
        .post("/users/login")
        .send({ email: "test@example.com" });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("required");
    });

    test("Login - invalid email => 401", async () => {
      const res = await request(app)
        .post("/users/login")
        .send({ email: "invalid@example.com", password: "password123" });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain("Invalid");
    });

    test("Login - invalid password => 401", async () => {
      const res = await request(app)
        .post("/users/login")
        .send({ email: testUser.email, password: "wrongpassword" });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain("Invalid");
    });

    test("Login - successful login", async () => {
      const res = await request(app).post("/users/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
      expect(res.body.username).toBe(testUser.username);
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).toHaveProperty("profileImage");

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      userId = res.body._id;
      user = await User.findById(userId);
    });
  });

  describe("GET /users", () => {
    test("Get all users - without auth => 200", async () => {
      const res = await request(app).get("/users");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).not.toHaveProperty("password");
      expect(res.body[0]).not.toHaveProperty("refreshTokens");
    });

    test("Get all users - with auth => 200", async () => {
      const res = await request(app)
        .get("/users")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).not.toHaveProperty("password");
      expect(res.body[0]).not.toHaveProperty("refreshTokens");
    });

    test("Get all users - with invalid token => 200", async () => {
      const res = await request(app)
        .get("/users")
        .set("Authorization", "Bearer invalid.token.here");

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /users/:userId", () => {
    test("Get user - without auth => 200", async () => {
      const res = await request(app).get(`/users/${userId}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(userId);
      expect(res.body.username).toBeDefined();
      expect(res.body.email).toBeDefined();
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).not.toHaveProperty("refreshTokens");
    });

    test("Get user - with auth => 200", async () => {
      const res = await request(app)
        .get(`/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(userId);
      expect(res.body.username).toBeDefined();
      expect(res.body.email).toBeDefined();
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).not.toHaveProperty("refreshTokens");
    });

    test("Get user - invalid ID => 400", async () => {
      const res = await request(app)
        .get("/users/invalid-id")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(400);
    });

    test("Get user - non-existent ID => 404", async () => {
      const res = await request(app)
        .get("/users/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /users/me", () => {
    test("Get me - without auth => 401", async () => {
      const res = await request(app).get("/users/me");
      expect(res.statusCode).toBe(401);
    });

    test("Get me - with auth => 200", async () => {
      const res = await request(app)
        .get("/users/me")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(userId);
      expect(res.body.username).toBeDefined();
      expect(res.body.email).toBeDefined();
      expect(res.body).not.toHaveProperty("password");
      expect(res.body).not.toHaveProperty("refreshTokens");
    });
  });

  describe("PUT /users/:userId", () => {
    test("Update user - without auth => 401", async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .field("username", "newusername");

      expect(res.statusCode).toBe(401);
    });

    test("Update user - forbidden on another user => 403", async () => {
      const res = await request(app)
        .put(`/users/${secondUserId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("username", "shouldfail");

      expect(res.statusCode).toBe(403);
    });

    test("Update user - change username => 200", async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("username", "updatedusername");

      expect(res.statusCode).toBe(200);
      expect(res.body.username).toBe("updatedusername");
      expect(res.body.email).toBe(testUser.email);

      user = await User.findById(userId);
    });

    test("Update user - email should not be updated", async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("email", "newemail@example.com");

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe(testUser.email);
    });

    test("Update user - password should not be updated", async () => {
      const res = await request(app)
        .put(`/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .field("password", "newpassword123");

      expect(res.statusCode).toBe(200);

      const loginRes = await request(app).post("/users/login").send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginRes.statusCode).toBe(200);
    });

    test("Update user - invalid ID but not my user => 403", async () => {
      const res = await request(app)
        .put("/users/invalid-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .field("username", "newusername");

      expect(res.statusCode).toBe(403);
    });
  });

  describe("PUT /users/me", () => {
    test("Update me - without auth => 401", async () => {
      const res = await request(app)
        .put("/users/me")
        .field("username", "meShouldFail");

      expect(res.statusCode).toBe(401);
    });

    test("Update me - username only => 200", async () => {
      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .field("username", "updated_via_me");

      expect(res.statusCode).toBe(200);
      expect(res.body.username).toBe("updated_via_me");
      expect(res.body.email).toBe(testUser.email);

      user = await User.findById(userId);
    });

    test("Update me - email should not be updated", async () => {
      const res = await request(app)
        .put("/users/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .field("email", "shouldnotchange@example.com");

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe(testUser.email);
    });
  });

  describe("GET /users/me/posts and /users/:userId/posts", () => {
    test("Create post directly in DB for current user", async () => {
      user = await User.findById(userId);

      await Post.create({
        title: "My first post",
        content: "My post content",
        createdBy: user,
      });
    });

    test("Get my posts - without auth => 401", async () => {
      const res = await request(app).get("/users/me/posts");
      expect(res.statusCode).toBe(401);
    });

    test("Get my posts - with auth => 200", async () => {
      const res = await request(app)
        .get("/users/me/posts")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    test("Get user posts by id - public => 200", async () => {
      const res = await request(app).get(`/users/${userId}/posts`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /users/refresh", () => {
    test("Refresh token - missing token => 400", async () => {
      const res = await request(app).post("/users/refresh").send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("required");
    });

    test("Refresh token - invalid token => 401", async () => {
      const res = await request(app)
        .post("/users/refresh")
        .send({ refreshToken: "invalid.token.here" });

      expect(res.statusCode).toBe(401);
    });

    test("Refresh token - valid token => 200", async () => {
      const res = await request(app)
        .post("/users/refresh")
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });
  });

  describe("POST /users/logout", () => {
    test("Logout - without auth => 401", async () => {
      const res = await request(app).post("/users/logout").send({});
      expect(res.statusCode).toBe(401);
    });

    test("Logout - with auth => 200", async () => {
      const res = await request(app)
        .post("/users/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("Logged out");
    });

    test("Logout - refresh token should be invalid after logout => 401", async () => {
      const res = await request(app)
        .post("/users/refresh")
        .send({ refreshToken });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("DELETE /users/:userId", () => {
    test("Delete user - first register a new user", async () => {
      const res = await request(app).post("/users/register").send({
        username: "usertodeleta",
        email: "usertodelete@example.com",
        password: "password123",
      });

      expect(res.statusCode).toBe(201);

      userId = res.body._id;
      accessToken = res.body.accessToken;
      user = await User.findById(userId);
    });

    test("Delete user - without auth => 401", async () => {
      const res = await request(app).delete(`/users/${userId}`);
      expect(res.statusCode).toBe(401);
    });

    test("Delete user - forbidden on another user => 403", async () => {
      const res = await request(app)
        .delete(`/users/${secondUserId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(403);
    });

    test("Delete user - with auth => 200", async () => {
      const res = await request(app)
        .delete(`/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("successfully");
    });

    test("Delete user - deleted user should not exist => 404", async () => {
      const res = await request(app)
        .get(`/users/${userId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(404);
    });

    test("Delete user - non-existent ID but not my user => 403", async () => {
      const res = await request(app)
        .delete("/users/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.statusCode).toBe(403);
    });
  });
});