import request from "supertest";
import intApp from "../index";
import User from "../models/User";
import type { Express } from "express";

let app: Express;
let accessToken: string;
let refreshToken: string;
let userId: string;

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
});

afterAll(async () => {
    await User.deleteMany({});
});

describe("Users API", () => {
    // Registration tests
    describe("POST /users/register", () => {
        test("Register - missing fields => 400", async () => {
            const res = await request(app)
                .post("/users/register")
                .send({ username: "testuser" });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain("Missing required fields");
        });

        test("Register - successful registration", async () => {
            const res = await request(app)
                .post("/users/register")
                .send(testUser);
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty("_id");
            expect(res.body).toHaveProperty("accessToken");
            expect(res.body).toHaveProperty("refreshToken");
            expect(res.body.username).toBe(testUser.username);
            expect(res.body.email).toBe(testUser.email);
            expect(res.body).not.toHaveProperty("password");

            userId = res.body._id;
            accessToken = res.body.accessToken;
            refreshToken = res.body.refreshToken;
        });

        test("Register - duplicate email => 409", async () => {
            const res = await request(app)
                .post("/users/register")
                .send({
                    username: "differentuser",
                    email: testUser.email,
                    password: "password123",
                });
            expect(res.statusCode).toBe(409);
            expect(res.body.error).toContain("already exists");
        });

        test("Register - duplicate username => 409", async () => {
            const res = await request(app)
                .post("/users/register")
                .send({
                    username: testUser.username,
                    email: "different@example.com",
                    password: "password123",
                });
            expect(res.statusCode).toBe(409);
            expect(res.body.error).toContain("already exists");
        });

        test("Register - second user", async () => {
            const res = await request(app)
                .post("/users/register")
                .send(testUser2);
            expect(res.statusCode).toBe(201);
            expect(res.body.username).toBe(testUser2.username);
        });
    });

    // Login tests
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
            const res = await request(app)
                .post("/users/login")
                .send({
                    email: testUser.email,
                    password: testUser.password,
                });
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("accessToken");
            expect(res.body).toHaveProperty("refreshToken");
            expect(res.body.username).toBe(testUser.username);
            expect(res.body).not.toHaveProperty("password");

            // Update tokens for further tests
            accessToken = res.body.accessToken;
            refreshToken = res.body.refreshToken;
        });
    });

    // Get all users tests
    describe("GET /users", () => {
        test("Get all users - without auth => 200", async () => {
            const res = await request(app).get("/users");
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            expect(res.body[0]).not.toHaveProperty("password");
            expect(res.body[0]).toHaveProperty("refreshTokens");
        });

        test("Get all users - with auth => 200", async () => {
            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            expect(res.body[0]).not.toHaveProperty("password");
            expect(res.body[0]).toHaveProperty("refreshTokens");
        });

        test("Get all users - with invalid token => 200", async () => {
            const res = await request(app)
                .get("/users")
                .set("Authorization", `Bearer invalid.token.here`);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });

    // Get user by ID tests
    describe("GET /users/:userId", () => {
        test("Get user - without auth => 200", async () => {
            const res = await request(app).get(`/users/${userId}`);
            expect(res.statusCode).toBe(200);
            expect(res.body._id).toBe(userId);
            expect(res.body.username).toBe(testUser.username);
            expect(res.body.email).toBe(testUser.email);
            expect(res.body).not.toHaveProperty("password");
        });

        test("Get user - with auth => 200", async () => {
            const res = await request(app)
                .get(`/users/${userId}`)
                .set("Authorization", `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body._id).toBe(userId);
            expect(res.body.username).toBe(testUser.username);
            expect(res.body.email).toBe(testUser.email);
            expect(res.body).not.toHaveProperty("password");
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

    // Update user tests
    describe("PUT /users/:userId", () => {
        test("Update user - without auth => 200", async () => {
            const res = await request(app)
                .put(`/users/${userId}`)
                .send({ username: "newusername" });
            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe("newusername");
        });

        test("Update user - change username => 200", async () => {
            const res = await request(app)
                .put(`/users/${userId}`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ username: "updatedusername" });
            expect(res.statusCode).toBe(200);
            expect(res.body.username).toBe("updatedusername");
            expect(res.body.email).toBe(testUser.email);
        });

        test("Update user - change email => 200", async () => {
            const res = await request(app)
                .put(`/users/${userId}`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ email: "newemail@example.com" });
            expect(res.statusCode).toBe(200);
            expect(res.body.email).toBe("newemail@example.com");
        });

        test("Update user - cannot change password => password not updated", async () => {
            const res = await request(app)
                .put(`/users/${userId}`)
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ password: "newpassword123" });
            expect(res.statusCode).toBe(200);

            // Verify password wasn't changed by trying to login with old password
            const loginRes = await request(app)
                .post("/users/login")
                .send({
                    email: "newemail@example.com",
                    password: testUser.password,
                });
            expect(loginRes.statusCode).toBe(200);
        });

        test("Update user - invalid ID => 400", async () => {
            const res = await request(app)
                .put("/users/invalid-id")
                .set("Authorization", `Bearer ${accessToken}`)
                .send({ username: "newusername" });
            expect(res.statusCode).toBe(400);
        });
    });

    // Refresh token tests
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
            expect(res.body).toHaveProperty("accessToken");
            expect(res.body).toHaveProperty("refreshToken");

            // Update tokens for further tests
            accessToken = res.body.accessToken;
            refreshToken = res.body.refreshToken;
        });
    });

    // Logout tests
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

    // Delete user tests
    describe("DELETE /users/:userId", () => {
        test("Delete user - first register a new user", async () => {
            const res = await request(app)
                .post("/users/register")
                .send({
                    username: "usertodeleta",
                    email: "usertodelete@example.com",
                    password: "password123",
                });
            expect(res.statusCode).toBe(201);
            userId = res.body._id;
            accessToken = res.body.accessToken;
        });

        test("Delete user - without auth => 401", async () => {
            const res = await request(app).delete(`/users/${userId}`);
            expect(res.statusCode).toBe(401);
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

        test("Delete user - non-existent ID => 404", async () => {
            const res = await request(app)
                .delete("/users/507f1f77bcf86cd799439011")
                .set("Authorization", `Bearer ${accessToken}`);
            expect(res.statusCode).toBe(404);
        });
    });
});
