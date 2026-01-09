const express = require("express");
const router = express.Router();

const postController = require("../controllers/postController");

router.get("/", (req, res) => {
  if (req.query.sender) {
    return postController.getPostsBySender(req, res);
  }
  return postController.getAllPosts(req, res);
});

router.get("/:postId", postController.getPostById);

router.get("/:postId/comments", postController.getCommentsByPost);

router.post("/", postController.createPost);

router.put("/:postId", postController.updatePost);

module.exports = router;
