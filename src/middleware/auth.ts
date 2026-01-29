import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
}

export const authMiddleware = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res
            .status(401)
            .json({ error: "Access token is missing or invalid" });
    }

    try {
        const secret = process.env.JWT_SECRET || "your-secret-key";
        const decoded = jwt.verify(token, secret) as { userId: string };
        req.userId = decoded.userId;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired access token" });
    }
};

export const generateAccessToken = (userId: string): string => {
    const secret = process.env.JWT_SECRET || "your-secret-key";
    return jwt.sign({ userId }, secret, { expiresIn: "15m" });
};

export const generateRefreshToken = (userId: string): string => {
    const secret = process.env.JWT_REFRESH_SECRET || "your-refresh-secret";
    return jwt.sign({ userId }, secret, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string): { userId: string } | null => {
    try {
        const secret = process.env.JWT_REFRESH_SECRET || "your-refresh-secret";
        return jwt.verify(token, secret) as { userId: string };
    } catch (err) {
        return null;
    }
};
