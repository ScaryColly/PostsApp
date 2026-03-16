import express from "express";
import userController from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";
import { profileImageUpload } from "../middleware/upload";

const router = express.Router();
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with username, email, and password
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: "john_doe"
 *                 minLength: 3
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing required fields or invalid input
 *       409:
 *         description: User with this email or username already exists
 */
router.post(
  "/register",
  profileImageUpload.single("profileImage"),
  userController.register.bind(userController)
);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Email and password are required
 *       401:
 *         description: Invalid email or password
 */
router.post("/login", userController.login.bind(userController));

/**
 * @swagger
 * /users/google:
 *   post:
 *     summary: Login or register with Google
 *     description: Authenticate a user using Google external provider
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GoogleAuthRequest'
 *     responses:
 *       200:
 *         description: Google authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Google idToken is required
 *       401:
 *         description: Google authentication failed
 */
router.post("/google", userController.googleLogin.bind(userController));

/**
 * @swagger
 * /users/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a valid refresh token
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Refresh token is required
 *       401:
 *         description: Invalid refresh token
 */
router.post("/refresh", userController.refreshToken.bind(userController));

/**
 * @swagger
 * /users/logout:
 *   post:
 *     summary: User logout
 *     description: Logout the authenticated user and invalidate refresh token
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: User not found
 */
router.post("/logout", authMiddleware, userController.logout.bind(userController));

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current user
 *     description: Retrieve the currently authenticated user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: User not found
 */
router.get("/me", authMiddleware, userController.getMe.bind(userController));

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Update current user
 *     description: Update the current authenticated user username and/or profile image
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCurrentUserFormData'
 *     responses:
 *       200:
 *         description: Current user updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: User not authenticated
 *       404:
 *         description: User not found
 */
router.put(
  "/me",
  authMiddleware,
  profileImageUpload.single("profileImage"),
  userController.updateMe.bind(userController),
);

/**
 * @swagger
 * /users/me/posts:
 *   get:
 *     summary: Get current user posts
 *     description: Retrieve all posts created by the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved current user posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       401:
 *         description: User not authenticated
 */
router.get(
  "/me/posts",
  authMiddleware,
  userController.getUserPosts.bind(userController),
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve list of all users (public)
 *     tags: [Users]
 *     security: []
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get("/", userController.getAllUsers.bind(userController));

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID (public)
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid user ID
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/:userId", userController.getUserById.bind(userController));

/**
 * @swagger
 * /users/{userId}/posts:
 *   get:
 *     summary: Get posts by user ID
 *     description: Retrieve all posts created by a specific user
 *     tags: [Users]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 */
router.get("/:userId/posts", userController.getUserPosts.bind(userController));

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update user
 *     description: Update user information (username and profile image only, only the owner can update)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateCurrentUserFormData'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or invalid user ID
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - can update only own user
 *       404:
 *         description: User not found
 */
router.put(
  "/:userId",
  authMiddleware,
  profileImageUpload.single("profileImage"),
  userController.updateUser.bind(userController),
);

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user account (only the owner can delete)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: User not authenticated
 *       403:
 *         description: Forbidden - can delete only own user
 *       404:
 *         description: User not found
 */
router.delete(
  "/:userId",
  authMiddleware,
  userController.deleteUser.bind(userController),
);

export default router;