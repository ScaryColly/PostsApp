import express from "express";
import postController from "../controllers/postController";
import { authMiddleware } from "../middleware/auth";
import { postImageUpload } from "../middleware/upload";

const router = express.Router();

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
 *         description: Filter posts by createdBy
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
 * /posts/search:
 *   post:
 *     summary: Search posts using free-text query
 *     description: Performs free-text search with pagination. Relative date phrases such as "all posts from yesterday" are interpreted against post createdAt.
 *     tags: [Posts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: "all posts from yesterday"
 *               page:
 *                 type: integer
 *                 example: 1
 *               limit:
 *                 type: integer
 *                 example: 20
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Failed to search posts
 */
router.post(
  "/search",
  authMiddleware,
  postController.searchPosts.bind(postController),
);

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
router.get(
  "/:postId/comments",
  postController.getCommentsByPost.bind(postController),
);

/**
 * @swagger
 * /posts/{postId}/like:
 *   post:
 *     summary: Like a post
 *     description: Mark a post as liked by a specific user.
 *     tags: [Posts]
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
 *             $ref: '#/components/schemas/PostLikeRequest'
 *     responses:
 *       200:
 *         description: Post liked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostLikeResponse'
 *       400:
 *         description: userId is required or invalid post id
 *       404:
 *         description: Post not found
 */
router.post("/:postId/like", postController.likePost.bind(postController));

/**
 * @swagger
 * /posts/{postId}/like:
 *   delete:
 *     summary: Remove like from a post
 *     description: Remove a specific user's like from a post.
 *     tags: [Posts]
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
 *             $ref: '#/components/schemas/PostLikeRequest'
 *     responses:
 *       200:
 *         description: Like removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostLikeResponse'
 *       400:
 *         description: userId is required or invalid post id
 *       404:
 *         description: Post not found
 */
router.delete("/:postId/like", postController.unlikePost.bind(postController));

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [createdBy, title, content]
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
 *               image:
 *                 type: string
 *                 format: binary
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
router.post(
  "/",
  postImageUpload.single("image"),
  postController.createPost.bind(postController),
);

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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [createdBy, title, content]
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
 *               image:
 *                 type: string
 *                 format: binary
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
router.put(
  "/:postId",
  postImageUpload.single("image"),
  postController.updatePost.bind(postController),
);

/**
 * @swagger
 * /posts/{postId}:
 *   delete:
 *     summary: Delete a post
 *     description: Delete an existing post by ID. No authentication required.
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
 *         description: Post successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Post not found
 *       400:
 *         description: Invalid post id
 */
router.delete("/:postId", postController.deletePost.bind(postController));

export default router;
