import postController from "../controllers/postController";
import Post from "../models/Post";
import Comment from "../models/Comment";

const mockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

afterEach(() => {
    jest.restoreAllMocks();
});

describe("PostController unit tests", () => {
    test("getPostsBySender - missing sender => 400", async () => {
        const req: any = { query: {} };
        const res = mockRes();
        await (postController as any).getPostsBySender(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "sender query parameter is required" });
    });

    test("getPostById - not found => 404", async () => {
        const req: any = { params: { postId: "abc" } };
        const res = mockRes();
        jest.spyOn(Post, "findById").mockResolvedValue(null as any);
        await (postController as any).getPostById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Post not found" });
    });

    test("getPostById - error => 400", async () => {
        const req: any = { params: { postId: "abc" } };
        const res = mockRes();
        jest.spyOn(Post, "findById").mockRejectedValue(new Error("boom"));
        await (postController as any).getPostById(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "תקלה בשליפת הפוסט לפי ID" });
    });

    test("getCommentsByPost - error => 500", async () => {
        const req: any = { params: { postId: "p1" } };
        const res = mockRes();
        const collection: any = (Comment as any).collection;
        jest.spyOn(collection, "find").mockImplementation(() => {
            throw new Error("boom");
        });
        await (postController as any).getCommentsByPost(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "Failed to get comments" });
    });

    test("createPost - error => 500", async () => {
        const req: any = { body: { senderId: "u", title: "t", content: "c" } };
        const res = mockRes();
        jest.spyOn(Post, "create").mockRejectedValue(new Error("db"));
        await (postController as any).createPost(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו ליצור את הפוסט" });
    });

    test("updatePost - missing fields => 400", async () => {
        const req: any = { params: { postId: "x" }, body: { title: "t" } };
        const res = mockRes();
        await (postController as any).updatePost(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "senderId, title and content are required" });
    });

    test("updatePost - not found => 404", async () => {
        const req: any = { params: { postId: "x" }, body: { senderId: "u", title: "t", content: "c" } };
        const res = mockRes();
        jest.spyOn(Post, "findByIdAndUpdate").mockResolvedValue(null as any);
        await (postController as any).updatePost(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Post not found" });
    });

    test("updatePost - error => 500", async () => {
        const req: any = { params: { postId: "x" }, body: { senderId: "u", title: "t", content: "c" } };
        const res = mockRes();
        jest.spyOn(Post, "findByIdAndUpdate").mockRejectedValue(new Error("db"));
        await (postController as any).updatePost(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו לעדכן את הפוסט" });
    });

    test("getAllPosts - error => 500", async () => {
        const req: any = { query: {} };
        const res = mockRes();
        jest.spyOn(Post, "find").mockImplementation(() => { throw new Error("boom"); });
        await (postController as any).getAllPosts(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו להביא את הפוסטים" });
    });

    test("getPostsBySender - error => 500", async () => {
        const req: any = { query: { sender: "u" } };
        const res = mockRes();
        jest.spyOn(Post, "find").mockImplementation(() => { throw new Error("boom"); });
        await (postController as any).getPostsBySender(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: "לא הצלחנו להביא את הפוסטים לפי שליח" });
    });
});