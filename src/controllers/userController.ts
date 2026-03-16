import fs from "fs";
import path from "path";
import { Response } from "express";
import { OAuth2Client } from "google-auth-library";
import BaseController from "./baseController";
import { User } from "../models/User";
import { Post } from "../models/Post";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthRequest,
} from "../middleware/auth";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

class UserController extends BaseController {
  constructor() {
    super(User);
  }

  private buildUserResponse(user: any) {
    return {
      _id: user._id,
      username: user.username,
      email: user.email || null,
      profileImage: user.profileImage || null,
      authProvider: user.authProvider || "local",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async issueTokensAndSave(user: any) {
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(refreshToken);
    await user.save();

    return { accessToken, refreshToken };
  }

  private removeOldProfileImage(profileImage?: string | null) {
    if (!profileImage) return;

    if (!profileImage.startsWith("/uploads/profiles/")) return;

    const relativePath = profileImage.startsWith("/")
      ? profileImage.slice(1)
      : profileImage;

    const absolutePath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  async getAllUsers(_req: AuthRequest, res: Response) {
    try {
      const users = await User.find().select("-password -refreshTokens -providerId");
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
        "-password -refreshTokens -providerId",
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(user);
    } catch (err) {
      console.error("תקלה בשליפת המשתמש לפי ID:", (err as Error).message);
      return res.status(400).json({ error: "תקלה בשליפת המשתמש לפי ID" });
    }
  }

  async getMe(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const user = await User.findById(req.userId).select(
        "-password -refreshTokens -providerId",
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(user);
    } catch (err) {
      console.error("תקלה בשליפת המשתמש המחובר:", (err as Error).message);
      return res.status(500).json({ error: "Failed to get current user" });
    }
  }

  async getUserPosts(req: AuthRequest, res: Response) {
    try {
      const userId = (req.params.userId ?? req.userId) as string | undefined;

      if (!userId) {
        return res.status(400).json({ error: "User id is required" });
      }

      const posts = await Post.find({ createdBy: userId as any })
        .populate("createdBy", "username email profileImage")
        .sort({ createdAt: -1 });

      return res.json(posts);
    } catch (err) {
      console.error("תקלה בשליפת פוסטים של משתמש:", (err as Error).message);
      return res.status(500).json({ error: "Failed to get user posts" });
    }
  }

  async register(req: AuthRequest, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const existingUser = await User.findOne({ username: username.trim() });

      if (existingUser) {
        if (req.file) {
          this.removeOldProfileImage(`/uploads/profiles/${req.file.filename}`);
        }

        return res
          .status(409)
          .json({ error: "User with this username already exists" });
      }

      const profileImage = req.file
        ? `/uploads/profiles/${req.file.filename}`
        : undefined;

      const newUser = await User.create({
        username: username.trim(),
        password,
        profileImage,
        authProvider: "local",
      });

      const { accessToken, refreshToken } = await this.issueTokensAndSave(newUser);

      return res.status(201).json({
        ...this.buildUserResponse(newUser),
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
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password are required" });
      }

      const user = await User.findOne({ username: username.trim() });

      if (!user || (user.authProvider && user.authProvider !== "local")) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isPasswordValid = await (user as any).comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const { accessToken, refreshToken } = await this.issueTokensAndSave(user);

      return res.json({
        ...this.buildUserResponse(user),
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("תקלה בכניסה:", (err as Error).message);
      return res.status(500).json({ error: "לא הצלחנו להיכנס" });
    }
  }

  async googleLogin(req: AuthRequest, res: Response) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: "Google idToken is required" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload?.email || !payload.sub) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      const email = payload.email.toLowerCase();
      let user = await User.findOne({ email });

      if (!user) {
        let baseUsername = (payload.name || email.split("@")[0] || "google_user")
          .trim()
          .replace(/\s+/g, "_")
          .toLowerCase();

        if (baseUsername.length < 3) {
          baseUsername = `user_${Date.now()}`;
        }

        let uniqueUsername = baseUsername;
        let counter = 1;

        while (await User.findOne({ username: uniqueUsername })) {
          uniqueUsername = `${baseUsername}_${counter++}`;
        }

        user = await User.create({
          username: uniqueUsername,
          email,
          authProvider: "google",
          providerId: payload.sub,
          profileImage: payload.picture || undefined,
        });
      } else {
        if (!user.authProvider) {
          user.authProvider = "google";
        }

        if (!user.providerId) {
          user.providerId = payload.sub;
        }

        if (!user.profileImage && payload.picture) {
          user.profileImage = payload.picture;
        }

        await user.save();
      }

      const { accessToken, refreshToken } = await this.issueTokensAndSave(user);

      return res.json({
        ...this.buildUserResponse(user),
        accessToken,
        refreshToken,
      });
    } catch (err) {
      console.error("תקלה בכניסה עם גוגל:", (err as Error).message);
      return res.status(401).json({ error: "Google authentication failed" });
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
        (t) => t !== refreshToken,
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
          (t) => t !== refreshToken,
        );
      } else {
        user.refreshTokens = [];
      }

      await user.save();

      return res.json({ message: "Logged out successfully" });
    } catch (err) {
      console.error("תקלה ביציאה:", (err as Error).message);
      return res.status(500).json({ error: "לא הצלחנו לצאת" });
    }
  }

  async updateUser(req: AuthRequest, res: Response) {
    try {
      req.params.id = req.params.userId;

      if (!req.userId || req.userId !== req.params.userId) {
        return res.status(403).json({ error: "You can update only your own user" });
      }

      const { username } = req.body;
      const updateData: any = {};

      if (username) {
        const existingUserWithSameUsername = await User.findOne({
          username: username.trim(),
          _id: { $ne: req.userId },
        });

        if (existingUserWithSameUsername) {
          return res.status(409).json({ error: "Username already taken" });
        }

        updateData.username = username.trim();
      }

      if (req.file) {
        const existingUser = await User.findById(req.userId);

        if (!existingUser) {
          return res.status(404).json({ error: "User not found" });
        }

        if (existingUser.profileImage?.startsWith("/uploads/profiles/")) {
          this.removeOldProfileImage(existingUser.profileImage);
        }

        updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
      }

      const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
      }).select("-password -refreshTokens -providerId");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json(user);
    } catch (err) {
      console.error("תקלה בעדכון המשתמש:", (err as Error).message);
      return res.status(400).json({ error: "לא הצלחנו לעדכן את המשתמש" });
    }
  }

  async updateMe(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      req.params.userId = req.userId;
      return this.updateUser(req, res);
    } catch (err) {
      console.error("תקלה בעדכון המשתמש המחובר:", (err as Error).message);
      return res.status(400).json({ error: "Failed to update current user" });
    }
  }

  async deleteUser(req: AuthRequest, res: Response) {
    try {
      req.params.id = req.params.userId;

      if (!req.userId || req.userId !== req.params.userId) {
        return res.status(403).json({ error: "You can delete only your own user" });
      }

      const user = await User.findByIdAndDelete(req.params.id);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.profileImage?.startsWith("/uploads/profiles/")) {
        this.removeOldProfileImage(user.profileImage);
      }

      return res.json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("תקלה במחיקת המשתמש:", (err as Error).message);
      return res.status(400).json({ error: "לא הצלחנו למחוק את המשתמש" });
    }
  }
}

export default new UserController();