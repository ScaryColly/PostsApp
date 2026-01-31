import commentController from "../controllers/commentController";
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

describe("CommentController unit tests", () => {
    test("createComment - error => 400", async () => {
        const req: any = { body: {} };
        const res = mockRes();
        jest.spyOn(Comment, "create").mockRejectedValue(new Error("boom"));
        await (commentController as any).createComment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "boom" });
    });

    test("getCommentById - not found => 404", async () => {
        const req: any = { params: { commentId: "c1" } };
        const res = mockRes();
        jest.spyOn(Comment, "findById").mockResolvedValue(null as any);
        await (commentController as any).getCommentById(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Comment not found" });
    });

    test("getCommentById - error => 400", async () => {
        const req: any = { params: { commentId: "c1" } };
        const res = mockRes();
        jest.spyOn(Comment, "findById").mockRejectedValue(new Error("boom"));
        await (commentController as any).getCommentById(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid comment id" });
    });

    test("updateComment - not found => 404", async () => {
        const req: any = { params: { commentId: "c1" }, body: {} };
        const res = mockRes();
        jest.spyOn(Comment, "findByIdAndUpdate").mockResolvedValue(null as any);
        await (commentController as any).updateComment(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Comment not found" });
    });

    test("updateComment - error => 400", async () => {
        const req: any = { params: { commentId: "c1" }, body: {} };
        const res = mockRes();
        jest.spyOn(Comment, "findByIdAndUpdate").mockRejectedValue(new Error("boom"));
        await (commentController as any).updateComment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "boom" });
    });

    test("deleteComment - not found => 404", async () => {
        const req: any = { params: { commentId: "c1" } };
        const res = mockRes();
        jest.spyOn(Comment, "findByIdAndDelete").mockResolvedValue(null as any);
        await (commentController as any).deleteComment(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: "Comment not found" });
    });

    test("deleteComment - error => 400", async () => {
        const req: any = { params: { commentId: "c1" } };
        const res = mockRes();
        jest.spyOn(Comment, "findByIdAndDelete").mockRejectedValue(new Error("boom"));
        await (commentController as any).deleteComment(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: "Invalid comment id" });
    });
});
