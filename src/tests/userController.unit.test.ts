import userController from "../controllers/userController";
import User from "../models/User";
import * as auth from "../middleware/auth";

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

afterEach(() => {
    jest.restoreAllMocks();
});

describe("UserController unit tests", () => {
    test("getAllUsers - error => 500", async () => {
        const req: any = {};
        const res = mockRes();
        jest.spyOn(User, "find").mockImplementation(() => { throw new Error("boom"); });
        await (userController as any).getAllUsers(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו להביא את המשתמשים" });
    });

    test("getUserById - not found => 404", async () => {
        const req: any = { params: { userId: "u1" } };
        const res = mockRes();
        jest.spyOn(User, "findById").mockImplementation(() => ({ select: jest.fn().mockResolvedValue(null) } as any));
        await (userController as any).getUserById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("getUserById - error => 400", async () => {
        const req: any = { params: { userId: "u1" } };
        const res = mockRes();
        jest.spyOn(User, "findById").mockImplementation(() => ({ select: jest.fn().mockRejectedValue(new Error("boom")) } as any));
        await (userController as any).getUserById(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "תקלה בשליפת המשתמש לפי ID" });
    });

    test("register - missing fields => 400", async () => {
        const req: any = { body: { username: "u" } };
        const res = mockRes();
        await (userController as any).register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Missing required fields" });
    });

    test("register - existing user => 409", async () => {
        const req: any = { body: { username: "u", email: "e", password: "p" } };
        const res = mockRes();
        jest.spyOn(User, "findOne").mockResolvedValue({} as any);
        await (userController as any).register(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ error: "User with this email or username already exists" });
    });

    test("register - create error => 400", async () => {
        const req: any = { body: { username: "u", email: "e", password: "p" } };
        const res = mockRes();
        jest.spyOn(User, "findOne").mockResolvedValue(null as any);
        jest.spyOn(User, "create").mockRejectedValue(new Error("db"));
        await (userController as any).register(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו ליצור את המשתמש" });
    });

    test("login - missing fields => 400", async () => {
        const req: any = { body: { email: "e" } };
        const res = mockRes();
        await (userController as any).login(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Email and password are required" });
    });

    test("login - invalid email => 401", async () => {
        const req: any = { body: { email: "e", password: "p" } };
        const res = mockRes();
        jest.spyOn(User, "findOne").mockResolvedValue(null as any);
        await (userController as any).login(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid email or password" });
    });

    test("login - invalid password => 401", async () => {
        const fakeUser: any = { comparePassword: jest.fn().mockResolvedValue(false) };
        const req: any = { body: { email: "e", password: "p" } };
        const res = mockRes();
        jest.spyOn(User, "findOne").mockResolvedValue(fakeUser as any);
        await (userController as any).login(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid email or password" });
    });

    test("login - error => 500", async () => {
        const req: any = { body: { email: "e", password: "p" } };
        const res = mockRes();
        jest.spyOn(User, "findOne").mockRejectedValue(new Error("boom"));
        await (userController as any).login(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו להיכנס" });
    });

    test("refreshToken - missing => 400", async () => {
        const req: any = { body: {} };
        const res = mockRes();
        await (userController as any).refreshToken(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Refresh token is required" });
    });

    test("refreshToken - invalid token => 401", async () => {
        const req: any = { body: { refreshToken: "t" } };
        const res = mockRes();
        jest.spyOn(auth, "verifyRefreshToken").mockReturnValue(null as any);
        await (userController as any).refreshToken(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid refresh token" });
    });

    test("logout - unauthenticated => 401", async () => {
        const req: any = { body: {} };
        const res = mockRes();
        await (userController as any).logout(req, res);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "User not authenticated" });
    });

    test("logout - user not found => 404", async () => {
        const req: any = { body: {}, userId: "u" };
        const res = mockRes();
        jest.spyOn(User, "findById").mockResolvedValue(null as any);
        await (userController as any).logout(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("updateUser - not found => 404", async () => {
        const req: any = { params: { userId: "u" }, body: { username: "x" } };
        const res = mockRes();
        jest.spyOn(User, "findByIdAndUpdate").mockImplementation(() => ({ select: jest.fn().mockResolvedValue(null) } as any));
        await (userController as any).updateUser(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("updateUser - error => 400", async () => {
        const req: any = { params: { userId: "u" }, body: { username: "x" } };
        const res = mockRes();
        jest.spyOn(User, "findByIdAndUpdate").mockImplementation(() => ({ select: jest.fn().mockRejectedValue(new Error("boom")) } as any));
        await (userController as any).updateUser(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו לעדכן את המשתמש" });
    });

    test("deleteUser - not found => 404", async () => {
        const req: any = { params: { userId: "u" } };
        const res = mockRes();
        jest.spyOn(User, "findByIdAndDelete").mockResolvedValue(null as any);
        await (userController as any).deleteUser(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    test("deleteUser - error => 400", async () => {
        const req: any = { params: { userId: "u" } };
        const res = mockRes();
        jest.spyOn(User, "findByIdAndDelete").mockRejectedValue(new Error("boom"));
        await (userController as any).deleteUser(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו למחוק את המשתמש" });
    });
});
