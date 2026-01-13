import express from "express";
const router = express.Router();

import commentController from "../controllers/commentController";

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comments management
 */

/**
 * @swagger
 * /comments:
 *   get:
 *     summary: Get all comments
 *     description: Retrieve a list of all comments. No authentication required.
 *     tags: [Comments]
 *     security: []
 *     responses:
 *       200:
 *         description: Successfully retrieved comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
router.get("/", commentController.getComments.bind(commentController));

/**
 * @swagger
 * /comments/{commentId}:
 *   get:
 *     summary: Get comment by ID
 *     description: Retrieve a specific comment by its ID. No authentication required.
 *     tags: [Comments]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Successfully retrieved comment
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 *       400:
 *         description: Invalid comment id
 */
router.get("/:commentId", commentController.getCommentById.bind(commentController));

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Create a new comment
 *     description: Create a new comment. No authentication required.
 *     tags: [Comments]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postId, senderId, message]
 *             properties:
 *               postId:
 *                 type: string
 *                 example: "69665a97012d745083da47e4"
 *               senderId:
 *                 type: string
 *                 example: "user1"
 *               message:
 *                 type: string
 *                 example: "Nice post!"
 *     responses:
 *       201:
 *         description: Comment successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation / bad request
 */
router.post("/", commentController.createComment.bind(commentController));

/**
 * @swagger
 * /comments/{commentId}:
 *   put:
 *     summary: Update a comment
 *     description: Update an existing comment by ID. No authentication required.
 *     tags: [Comments]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               postId:
 *                 type: string
 *               senderId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Comment not found
 *       400:
 *         description: Validation / bad request
 */
router.put("/:commentId", commentController.updateComment.bind(commentController));

/**
 * @swagger
 * /comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Delete an existing comment by ID. No authentication required.
 *     tags: [Comments]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Comment not found
 *       400:
 *         description: Invalid comment id
 */
router.delete("/:commentId", commentController.deleteComment.bind(commentController));

export default router;
