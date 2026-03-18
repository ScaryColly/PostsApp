import express from "express";
const router = express.Router();

import postController from "../controllers/postController";

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Posts management
 */

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts (or filter by sender)
 *     description: Retrieve all posts. If sender query exists, returns only posts for that sender.
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: sender
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter posts by senderId
 *         example: "user1"
 *     responses:
 *       200:
 *         description: Successfully retrieved posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: Failed to get posts
 */
router.get("/", postController.getPosts.bind(postController));

/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Get post by ID
 *     description: Retrieve a specific post by its ID. No authentication required.
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Successfully retrieved post
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *       400:
 *         description: Invalid post id
 */
router.get("/:postId", postController.getPostById.bind(postController));

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Get comments for a post
 *     description: Retrieve comments by postId.
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Successfully retrieved comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       500:
 *         description: Failed to get comments
 */
router.get("/:postId/comments", postController.getCommentsByPost.bind(postController));

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new post. No authentication required.
 *     tags: [Posts]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senderId, title, content]
 *             properties:
 *               senderId:
 *                 type: string
 *                 example: "user1"
 *               title:
 *                 type: string
 *                 example: "Post A"
 *               content:
 *                 type: string
 *                 example: "Content A"
 *     responses:
 *       201:
 *         description: Post successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: senderId, title and content are required
 *       500:
 *         description: Failed to create post
 */
router.post("/", postController.createPost.bind(postController));

/**
 * @swagger
 * /posts/{postId}:
 *   put:
 *     summary: Update a post
 *     description: Update an existing post by ID. No authentication required.
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senderId, title, content]
 *             properties:
 *               senderId:
 *                 type: string
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Post successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: senderId, title and content are required
 *       404:
 *         description: Post not found
 *       500:
 *         description: Failed to update post
 */
router.put("/:postId", postController.updatePost.bind(postController));

export default router;
