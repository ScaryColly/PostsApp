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
 *     summary: Get all posts
 *     description: Retrieve all posts. If createdBy query exists, returns only posts for that user.
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: createdBy
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter posts by user ID
 *         example: "67d5c8d2f1a2b3c4d5e6f789"
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
 *     description: Retrieve a specific post by its ID.
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *         example: "67d5c8d2f1a2b3c4d5e6f123"
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
 *         example: "67d5c8d2f1a2b3c4d5e6f123"
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
 *     description: Create a new post.
 *     tags: [Posts]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - createdBy
 *               - title
 *               - content
 *             properties:
 *               createdBy:
 *                 type: string
 *                 description: User ID of the post creator
 *                 example: "67d5c8d2f1a2b3c4d5e6f789"
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
 *         description: createdBy, title and content are required
 *       500:
 *         description: Failed to create post
 */
router.post("/", postController.createPost.bind(postController));

/**
 * @swagger
 * /posts/{postId}:
 *   put:
 *     summary: Update a post
 *     description: Update an existing post by ID.
 *     tags: [Posts]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *         example: "67d5c8d2f1a2b3c4d5e6f123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - createdBy
 *               - title
 *               - content
 *             properties:
 *               createdBy:
 *                 type: string
 *                 description: User ID of the post creator
 *                 example: "67d5c8d2f1a2b3c4d5e6f789"
 *               title:
 *                 type: string
 *                 example: "Updated title"
 *               content:
 *                 type: string
 *                 example: "Updated content"
 *     responses:
 *       200:
 *         description: Post successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         description: createdBy, title and content are required
 *       404:
 *         description: Post not found
 *       500:
 *         description: Failed to update post
 */
router.put("/:postId", postController.updatePost.bind(postController));

export default router;