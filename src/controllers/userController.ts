import { Response } from "express";
import BaseController from "./baseController";
import User from "../models/User";

import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    AuthRequest,
} from "../middleware/auth";

class UserController extends BaseController {
    constructor() {
        super(User);
    }

    async getAllUsers(req: AuthRequest, res: Response) {
        try {
            const users = await User.find().select("-password");
            return res.json(users);
        } catch (err) {
            console.error("תקלה בשליפת המשתמשים:", (err as Error).message);
            return res.status(500).json({ error: "לא הצלחנו להביא את המשתמשים" });
        }
    }

    async getUserById(req: AuthRequest, res: Response) {
        try {
            req.params.id = req.params.userId;
            const user = await User.findById(req.params.id).select(
                "-password"
            );

            if (!user) return res.status(404).json({ error: "User not found" });
            return res.json(user);
        } catch (err) {
            console.error("תקלה בשליפת המשתמש לפי ID:", (err as Error).message);
            return res.status(400).json({ error: "תקלה בשליפת המשתמש לפי ID" });
        }
    }

    async register(req: AuthRequest, res: Response) {
        try {
            const { username, email, password } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            const existingUser = await User.findOne({
                $or: [{ email }, { username }],
            });
            if (existingUser) {
                return res
                    .status(409)
                    .json({ error: "User with this email or username already exists" });
            }

            const newUser = await User.create({ username, email, password });
            const accessToken = generateAccessToken(newUser._id.toString());
            const refreshToken = generateRefreshToken(newUser._id.toString());
            newUser.refreshTokens = [refreshToken];
            await newUser.save();

            return res.status(201).json({
                _id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                accessToken,
                refreshToken,
            });
        } catch (err) {
            console.error("תקלה ביצירת המשתמש:", (err as Error).message);
            return res.status(400).json({ error: "לא הצלחנו ליצור את המשתמש" });
        }
    }

    async login(req: AuthRequest, res: Response) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res
                    .status(400)
                    .json({ error: "Email and password are required" });
            }

            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            const isPasswordValid = await (user as any).comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            const accessToken = generateAccessToken(user._id.toString());
            const refreshToken = generateRefreshToken(user._id.toString());
            user.refreshTokens = user.refreshTokens || [];
            user.refreshTokens.push(refreshToken);
            await user.save();

            return res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                accessToken,
                refreshToken,
            });
        } catch (err) {
            console.error("תקלה בכניסה:", (err as Error).message);
            return res.status(500).json({ error: "לא הצלחנו להיכנס" });
        }
    }

    async refreshToken(req: AuthRequest, res: Response) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: "Refresh token is required" });
            }

            const decoded = verifyRefreshToken(refreshToken);
            if (!decoded) {
                return res.status(401).json({ error: "Invalid refresh token" });
            }

            const user = await User.findById(decoded.userId);
            if (!user || !user.refreshTokens?.includes(refreshToken)) {
                return res.status(401).json({ error: "Invalid refresh token" });
            }

            const newAccessToken = generateAccessToken(user._id.toString());
            const newRefreshToken = generateRefreshToken(user._id.toString());
            user.refreshTokens = (user.refreshTokens || []).filter(
                (t) => t !== refreshToken
            );
            user.refreshTokens.push(newRefreshToken);
            await user.save();

            return res.json({
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            });
        } catch (err) {
            console.error("תקלה בטעינה מחדש של הטוקן:", (err as Error).message);
            return res.status(500).json({ error: "לא הצלחנו לטעון מחדש את הטוקן" });
        }
    }

    async logout(req: AuthRequest, res: Response) {
        try {
            const { refreshToken } = req.body;

            if (!req.userId) {
                return res.status(401).json({ error: "User not authenticated" });
            }

            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            if (refreshToken) {
                user.refreshTokens = (user.refreshTokens || []).filter(
                    (t) => t !== refreshToken
                );
                await user.save();
            }

            return res.json({ message: "Logged out successfully" });
        } catch (err) {
            console.error("תקלה ביציאה:", (err as Error).message);
            return res.status(500).json({ error: "לא הצלחנו ליצאת" });
        }
    }

    async updateUser(req: AuthRequest, res: Response) {
        try {
            req.params.id = req.params.userId;
            const { username, email } = req.body;

            const updateData: any = {};
            if (username) updateData.username = username;
            if (email) updateData.email = email;

            const user = await User.findByIdAndUpdate(req.params.id, updateData, {
                new: true,
                runValidators: true,
            }).select("-password -refreshTokens");

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.json(user);
        } catch (err) {
            console.error("תקלה בעדכון המשתמש:", (err as Error).message);
            return res.status(400).json({ error: "לא הצלחנו לעדכן את המשתמש" });
        }
    }

    async deleteUser(req: AuthRequest, res: Response) {
        try {
            req.params.id = req.params.userId;
            const user = await User.findByIdAndDelete(req.params.id);

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.json({ message: "User deleted successfully" });
        } catch (err) {
            console.error("תקלה במחיקת המשתמש:", (err as Error).message);
            return res.status(400).json({ error: "לא הצלחנו למחוק את המשתמש" });
        }
    }
}

export default new UserController();
