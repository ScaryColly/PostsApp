import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

type TokenPayload = {
  userId: string;
};

const ACCESS_SECRET: jwt.Secret = process.env.JWT_SECRET || "your-secret-key";
const REFRESH_SECRET: jwt.Secret =
  process.env.JWT_REFRESH_SECRET || "your-refresh-secret";

const ACCESS_EXPIRES_IN: jwt.SignOptions["expiresIn"] =
  (process.env.JWT_TOKEN_EXPIRATION as jwt.SignOptions["expiresIn"]) || "15m";

const REFRESH_EXPIRES_IN: jwt.SignOptions["expiresIn"] =
  (process.env.JWT_REFRESH_TOKEN_EXPIRATION as jwt.SignOptions["expiresIn"]) || "7d";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : undefined;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Access token is missing or invalid" });
  }

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as TokenPayload;
    req.userId = decoded.userId;
    next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid or expired access token" });
  }
};

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
};

export const verifyRefreshToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
  } catch (_err) {
    return null;
  }
};