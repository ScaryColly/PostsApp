import fs from "fs";

let userController: any;
let User: any;
let Post: any;
let auth: any;
let OAuth2Client: jest.Mock;

let mockVerifyIdToken: jest.Mock;

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn(),
}));

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.restoreAllMocks();

  mockVerifyIdToken = jest.fn();

  const googleAuthLib = require("google-auth-library");
  OAuth2Client = googleAuthLib.OAuth2Client;

  OAuth2Client.mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  }));

  userController = require("../controllers/userController").default;
  User = require("../models/User").User;
  Post = require("../models/Post").Post;
  auth = require("../middleware/auth");
});

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("UserController unit tests", () => {
  test("getAllUsers - success => 200", async () => {
    const req: any = {};
    const res = mockRes();

    jest.spyOn(User, "find").mockImplementation(
      () =>
        ({
          select: jest.fn().mockResolvedValue([{ _id: "u1", username: "test" }]),
        }) as any,
    );

    await userController.getAllUsers(req, res);

    expect(res.json).toHaveBeenCalledWith([{ _id: "u1", username: "test" }]);
  });

  test("getAllUsers - error => 500", async () => {
    const req: any = {};
    const res = mockRes();

    jest.spyOn(User, "find").mockImplementation(() => {
      throw new Error("boom");
    });

    await userController.getAllUsers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "לא הצלחנו להביא את המשתמשים",
    });
  });

  test("getUserById - success => 200", async () => {
    const req: any = { params: { userId: "u1" } };
    const res = mockRes();

    jest.spyOn(User, "findById").mockImplementation(
      () =>
        ({
          select: jest.fn().mockResolvedValue({ _id: "u1", username: "abc" }),
        }) as any,
    );

    await userController.getUserById(req, res);

    expect(res.json).toHaveBeenCalledWith({ _id: "u1", username: "abc" });
  });

  test("getUserById - not found => 404", async () => {
    const req: any = { params: { userId: "u1" } };
    const res = mockRes();

    jest
      .spyOn(User, "findById")
      .mockImplementation(
        () => ({ select: jest.fn().mockResolvedValue(null) }) as any,
      );

    await userController.getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("getUserById - error => 400", async () => {
    const req: any = { params: { userId: "u1" } };
    const res = mockRes();

    jest
      .spyOn(User, "findById")
      .mockImplementation(
        () =>
          ({ select: jest.fn().mockRejectedValue(new Error("boom")) }) as any,
      );

    await userController.getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "תקלה בשליפת המשתמש לפי ID",
    });
  });

  test("getMe - unauthenticated => 401", async () => {
    const req: any = {};
    const res = mockRes();

    await userController.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "User not authenticated" });
  });

  test("getMe - success => 200", async () => {
    const req: any = { userId: "u1" };
    const res = mockRes();

    jest.spyOn(User, "findById").mockImplementation(
      () =>
        ({
          select: jest.fn().mockResolvedValue({ _id: "u1", username: "me" }),
        }) as any,
    );

    await userController.getMe(req, res);

    expect(res.json).toHaveBeenCalledWith({ _id: "u1", username: "me" });
  });

  test("getMe - user not found => 404", async () => {
    const req: any = { userId: "u1" };
    const res = mockRes();

    jest
      .spyOn(User, "findById")
      .mockImplementation(
        () => ({ select: jest.fn().mockResolvedValue(null) }) as any,
      );

    await userController.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("getMe - error => 500", async () => {
    const req: any = { userId: "u1" };
    const res = mockRes();

    jest.spyOn(User, "findById").mockImplementation(
      () =>
        ({
          select: jest.fn().mockRejectedValue(new Error("boom")),
        }) as any,
    );

    await userController.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to get current user" });
  });

  test("getUserPosts - missing user id => 400", async () => {
    const req: any = { params: {} };
    const res = mockRes();

    await userController.getUserPosts(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "User id is required" });
  });

  test("getUserPosts - ok => 200", async () => {
    const req: any = { params: { userId: "u1" } };
    const res = mockRes();

    jest.spyOn(Post, "find").mockImplementation(
      () =>
        ({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue([{ _id: "p1" }]),
        }) as any,
    );

    await userController.getUserPosts(req, res);

    expect(res.json).toHaveBeenCalledWith([{ _id: "p1" }]);
  });

  test("getUserPosts - fallback to req.userId => 200", async () => {
    const req: any = { params: {}, userId: "u1" };
    const res = mockRes();

    jest.spyOn(Post, "find").mockImplementation(
      () =>
        ({
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue([{ _id: "p2" }]),
        }) as any,
    );

    await userController.getUserPosts(req, res);

    expect(res.json).toHaveBeenCalledWith([{ _id: "p2" }]);
  });

  test("getUserPosts - error => 500", async () => {
    const req: any = { params: { userId: "u1" } };
    const res = mockRes();

    jest.spyOn(Post, "find").mockImplementation(() => {
      throw new Error("boom");
    });

    await userController.getUserPosts(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Failed to get user posts" });
  });

  test("register - missing fields => 400", async () => {
    const req: any = { body: { username: "u" } };
    const res = mockRes();

    await userController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing required fields" });
  });

  test("register - existing user => 409", async () => {
    const req: any = { body: { username: "u", email: "e", password: "p" } };
    const res = mockRes();

    jest.spyOn(User, "findOne").mockResolvedValue({} as any);

    await userController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "User with this email or username already exists",
    });
  });

  test("register - success => 201", async () => {
    const req: any = {
      body: { username: "u", email: "E@MAIL.COM", password: "p" },
    };
    const res = mockRes();

    const save = jest.fn().mockResolvedValue(undefined);

    jest.spyOn(User, "findOne").mockResolvedValue(null as any);
    jest.spyOn(User, "create").mockResolvedValue({
      _id: "u1",
      username: "u",
      email: "e@mail.com",
      profileImage: null,
      authProvider: "local",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      refreshTokens: [],
      save,
    } as any);

    jest.spyOn(auth, "generateAccessToken").mockReturnValue("access123");
    jest.spyOn(auth, "generateRefreshToken").mockReturnValue("refresh123");

    await userController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "u1",
        username: "u",
        email: "e@mail.com",
        accessToken: "access123",
        refreshToken: "refresh123",
      }),
    );
    expect(save).toHaveBeenCalled();
  });

  test("register - create error => 400", async () => {
    const req: any = { body: { username: "u", email: "e", password: "p" } };
    const res = mockRes();

    jest.spyOn(User, "findOne").mockResolvedValue(null as any);
    jest.spyOn(User, "create").mockRejectedValue(new Error("db"));

    await userController.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "לא הצלחנו ליצור את המשתמש",
    });
  });

  test("login - missing fields => 400", async () => {
    const req: any = { body: { email: "e" } };
    const res = mockRes();

    await userController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Email and password are required",
    });
  });

  test("login - invalid email => 401", async () => {
    const req: any = { body: { email: "e", password: "p" } };
    const res = mockRes();

    jest.spyOn(User, "findOne").mockResolvedValue(null as any);

    await userController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid email or password",
    });
  });

  test("login - non-local provider => 401", async () => {
    const req: any = { body: { email: "e", password: "p" } };
    const res = mockRes();

    jest.spyOn(User, "findOne").mockResolvedValue({
      authProvider: "google",
    } as any);

    await userController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid email or password",
    });
  });

  test("login - invalid password => 401", async () => {
    const fakeUser: any = {
      authProvider: "local",
      comparePassword: jest.fn().mockResolvedValue(false),
    };
    const req: any = { body: { email: "e", password: "p" } };
    const res = mockRes();

    jest.spyOn(User, "findOne").mockResolvedValue(fakeUser as any);

    await userController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Invalid email or password",
    });
  });

  test("login - success => 200", async () => {
    const req: any = { body: { email: "E@MAIL.COM", password: "p" } };
    const res = mockRes();

    const fakeUser: any = {
      _id: "u1",
      username: "u",
      email: "e@mail.com",
      authProvider: "local",
      refreshTokens: [],
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      profileImage: null,
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(User, "findOne").mockResolvedValue(fakeUser);
    jest.spyOn(auth, "generateAccessToken").mockReturnValue("access123");
    jest.spyOn(auth, "generateRefreshToken").mockReturnValue("refresh123");

    await userController.login(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "u1",
        accessToken: "access123",
        refreshToken: "refresh123",
      }),
    );
    expect(fakeUser.comparePassword).toHaveBeenCalledWith("p");
    expect(fakeUser.save).toHaveBeenCalled();
  });

  test("login - error => 500", async () => {
    const req: any = { body: { email: "e", password: "p" } };
    const res = mockRes();

    jest.spyOn(User, "findOne").mockRejectedValue(new Error("boom"));

    await userController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו להיכנס" });
  });

  test("googleLogin - missing token => 400", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await userController.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Google idToken is required" });
  });

  test("googleLogin - invalid payload => 401", async () => {
    const req: any = { body: { idToken: "google-token" } };
    const res = mockRes();

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: "", email: "" }),
    });

    await userController.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid Google token" });
  });

  test("googleLogin - create new google user => 200", async () => {
    const req: any = { body: { idToken: "google-token" } };
    const res = mockRes();

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "GoogleUser@mail.com",
        sub: "google-sub-1",
        name: "Google User",
        picture: "http://img",
      }),
    });

    const save = jest.fn().mockResolvedValue(undefined);

    jest
      .spyOn(User, "findOne")
      .mockResolvedValueOnce(null as any)
      .mockResolvedValueOnce(null as any);

    jest.spyOn(User, "create").mockResolvedValue({
      _id: "u1",
      username: "google_user",
      email: "googleuser@mail.com",
      authProvider: "google",
      providerId: "google-sub-1",
      profileImage: "http://img",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      refreshTokens: [],
      save,
    } as any);

    jest.spyOn(auth, "generateAccessToken").mockReturnValue("access123");
    jest.spyOn(auth, "generateRefreshToken").mockReturnValue("refresh123");

    await userController.googleLogin(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "u1",
        accessToken: "access123",
        refreshToken: "refresh123",
        authProvider: "google",
      }),
    );
    expect(save).toHaveBeenCalled();
  });

  test("googleLogin - existing user gets updated => 200", async () => {
    const req: any = { body: { idToken: "google-token" } };
    const res = mockRes();

    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: "existing@mail.com",
        sub: "google-sub-2",
        picture: "http://img2",
      }),
    });

    const existingUser: any = {
      _id: "u2",
      username: "existing",
      email: "existing@mail.com",
      authProvider: undefined,
      providerId: undefined,
      profileImage: undefined,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      refreshTokens: [],
      save: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(User, "findOne").mockResolvedValue(existingUser);
    jest.spyOn(auth, "generateAccessToken").mockReturnValue("accessABC");
    jest.spyOn(auth, "generateRefreshToken").mockReturnValue("refreshABC");

    await userController.googleLogin(req, res);

    expect(existingUser.authProvider).toBe("google");
    expect(existingUser.providerId).toBe("google-sub-2");
    expect(existingUser.profileImage).toBe("http://img2");
    expect(existingUser.save).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: "u2",
        accessToken: "accessABC",
        refreshToken: "refreshABC",
      }),
    );
  });

  test("googleLogin - error => 401", async () => {
    const req: any = { body: { idToken: "google-token" } };
    const res = mockRes();

    mockVerifyIdToken.mockRejectedValue(new Error("boom"));

    await userController.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Google authentication failed",
    });
  });

  test("refreshToken - missing => 400", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await userController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Refresh token is required",
    });
  });

  test("refreshToken - invalid token => 401", async () => {
    const req: any = { body: { refreshToken: "t" } };
    const res = mockRes();

    jest.spyOn(auth, "verifyRefreshToken").mockReturnValue(null as any);

    await userController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid refresh token" });
  });

  test("refreshToken - user not found => 401", async () => {
    const req: any = { body: { refreshToken: "t" } };
    const res = mockRes();

    jest
      .spyOn(auth, "verifyRefreshToken")
      .mockReturnValue({ userId: "u1" } as any);
    jest.spyOn(User, "findById").mockResolvedValue(null as any);

    await userController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid refresh token" });
  });

  test("refreshToken - token not in user tokens => 401", async () => {
    const req: any = { body: { refreshToken: "t" } };
    const res = mockRes();

    jest
      .spyOn(auth, "verifyRefreshToken")
      .mockReturnValue({ userId: "u1" } as any);
    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "u1",
      refreshTokens: [],
    } as any);

    await userController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid refresh token" });
  });

  test("refreshToken - success => 200", async () => {
    const req: any = { body: { refreshToken: "oldToken" } };
    const res = mockRes();

    jest.spyOn(auth, "verifyRefreshToken").mockReturnValue({ userId: "u1" } as any);
    jest.spyOn(auth, "generateAccessToken").mockReturnValue("newAccess");
    jest.spyOn(auth, "generateRefreshToken").mockReturnValue("newRefresh");

    const user: any = {
      _id: "u1",
      refreshTokens: ["oldToken", "another"],
      save: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(User, "findById").mockResolvedValue(user);

    await userController.refreshToken(req, res);

    expect(user.refreshTokens).toEqual(["another", "newRefresh"]);
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      accessToken: "newAccess",
      refreshToken: "newRefresh",
    });
  });

  test("refreshToken - error => 500", async () => {
    const req: any = { body: { refreshToken: "t" } };
    const res = mockRes();

    jest.spyOn(auth, "verifyRefreshToken").mockImplementation(() => {
      throw new Error("boom");
    });

    await userController.refreshToken(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "לא הצלחנו לטעון מחדש את הטוקן",
    });
  });

  test("logout - unauthenticated => 401", async () => {
    const req: any = { body: {} };
    const res = mockRes();

    await userController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "User not authenticated" });
  });

  test("logout - user not found => 404", async () => {
    const req: any = { body: {}, userId: "u" };
    const res = mockRes();

    jest.spyOn(User, "findById").mockResolvedValue(null as any);

    await userController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("logout - success => 200", async () => {
    const req: any = { body: { refreshToken: "t1" }, userId: "u1" };
    const res = mockRes();
    const save = jest.fn();

    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "u1",
      refreshTokens: ["t1", "t2"],
      save,
    } as any);

    await userController.logout(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "Logged out successfully",
    });
  });

  test("logout - no refresh token clears all => 200", async () => {
    const req: any = { body: {}, userId: "u1" };
    const res = mockRes();

    const user: any = {
      _id: "u1",
      refreshTokens: ["t1", "t2"],
      save: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(User, "findById").mockResolvedValue(user);

    await userController.logout(req, res);

    expect(user.refreshTokens).toEqual([]);
    expect(res.json).toHaveBeenCalledWith({
      message: "Logged out successfully",
    });
  });

  test("logout - error => 500", async () => {
    const req: any = { body: {}, userId: "u1" };
    const res = mockRes();

    jest.spyOn(User, "findById").mockRejectedValue(new Error("boom"));

    await userController.logout(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו ליצאת" });
  });

  test("updateUser - forbidden => 403", async () => {
    const req: any = {
      userId: "u1",
      params: { userId: "u2" },
      body: { username: "newname" },
    };
    const res = mockRes();

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("updateUser - success username => 200", async () => {
    const req: any = {
      userId: "u1",
      params: { userId: "u1" },
      body: { username: "newname" },
    };
    const res = mockRes();

    jest.spyOn(User, "findByIdAndUpdate").mockImplementation(
      () =>
        ({
          select: jest.fn().mockResolvedValue({
            _id: "u1",
            username: "newname",
          }),
        }) as any,
    );

    await userController.updateUser(req, res);

    expect(res.json).toHaveBeenCalledWith({
      _id: "u1",
      username: "newname",
    });
  });

  test("updateUser - not found => 404", async () => {
    const req: any = {
      userId: "u1",
      params: { userId: "u1" },
      body: { username: "x" },
    };
    const res = mockRes();

    jest
      .spyOn(User, "findByIdAndUpdate")
      .mockImplementation(
        () => ({ select: jest.fn().mockResolvedValue(null) }) as any,
      );

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("updateUser - file upload but existing user missing => 404", async () => {
    const req: any = {
      userId: "u1",
      params: { userId: "u1" },
      body: {},
      file: { filename: "pic.jpg" },
    };
    const res = mockRes();

    jest.spyOn(User, "findById").mockResolvedValue(null as any);

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("updateUser - success with profile image => 200", async () => {
    const req: any = {
      userId: "u1",
      params: { userId: "u1" },
      body: {},
      file: { filename: "pic.jpg" },
    };
    const res = mockRes();

    jest.spyOn(User, "findById").mockResolvedValue({
      _id: "u1",
      profileImage: "/uploads/profiles/old.jpg",
    } as any);

    jest.spyOn(User, "findByIdAndUpdate").mockImplementation(
      () =>
        ({
          select: jest.fn().mockResolvedValue({
            _id: "u1",
            profileImage: "/uploads/profiles/pic.jpg",
          }),
        }) as any,
    );

    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, "unlinkSync").mockImplementation(() => {});

    await userController.updateUser(req, res);

    expect(unlinkSpy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      _id: "u1",
      profileImage: "/uploads/profiles/pic.jpg",
    });
  });

  test("updateUser - error => 400", async () => {
    const req: any = {
      userId: "u1",
      params: { userId: "u1" },
      body: { username: "x" },
    };
    const res = mockRes();

    jest
      .spyOn(User, "findByIdAndUpdate")
      .mockImplementation(
        () =>
          ({ select: jest.fn().mockRejectedValue(new Error("boom")) }) as any,
      );

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "לא הצלחנו לעדכן את המשתמש",
    });
  });

  test("updateMe - unauthenticated => 401", async () => {
    const req: any = { body: { username: "x" }, params: {} };
    const res = mockRes();

    await userController.updateMe(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test("updateMe - success delegates to updateUser", async () => {
    const req: any = {
      userId: "u1",
      params: {},
      body: { username: "newme" },
    };
    const res = mockRes();

    jest.spyOn(User, "findByIdAndUpdate").mockImplementation(
      () =>
        ({
          select: jest.fn().mockResolvedValue({
            _id: "u1",
            username: "newme",
          }),
        }) as any,
    );

    await userController.updateMe(req, res);

    expect(req.params.userId).toBe("u1");
    expect(res.json).toHaveBeenCalledWith({
      _id: "u1",
      username: "newme",
    });
  });

  test("deleteUser - forbidden => 403", async () => {
    const req: any = {
      userId: "u1",
      params: { userId: "u2" },
    };
    const res = mockRes();

    await userController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("deleteUser - not found => 404", async () => {
    const req: any = { userId: "u1", params: { userId: "u1" } };
    const res = mockRes();

    jest.spyOn(User, "findByIdAndDelete").mockResolvedValue(null as any);

    await userController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
  });

  test("deleteUser - success => 200", async () => {
    const req: any = { userId: "u1", params: { userId: "u1" } };
    const res = mockRes();

    jest.spyOn(User, "findByIdAndDelete").mockResolvedValue({
      _id: "u1",
      profileImage: null,
    } as any);

    await userController.deleteUser(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: "User deleted successfully",
    });
  });

  test("deleteUser - success removes old image => 200", async () => {
    const req: any = { userId: "u1", params: { userId: "u1" } };
    const res = mockRes();

    jest.spyOn(User, "findByIdAndDelete").mockResolvedValue({
      _id: "u1",
      profileImage: "/uploads/profiles/old.jpg",
    } as any);

    jest.spyOn(fs, "existsSync").mockReturnValue(true);
    const unlinkSpy = jest.spyOn(fs, "unlinkSync").mockImplementation(() => {});

    await userController.deleteUser(req, res);

    expect(unlinkSpy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "User deleted successfully",
    });
  });

  test("deleteUser - error => 400", async () => {
    const req: any = { userId: "u1", params: { userId: "u1" } };
    const res = mockRes();

    jest.spyOn(User, "findByIdAndDelete").mockRejectedValue(new Error("boom"));

    await userController.deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "לא הצלחנו למחוק את המשתמש",
    });
  });
});