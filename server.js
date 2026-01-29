require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const postRoutes = require("./src/routes/posts");
const commentRoutes = require("./src/routes/comments");

const app = express();

app.use(express.json());

app.use("/posts", postRoutes);
app.use("/comments", commentRoutes);

app.get("/", (req, res) => {
    res.json({ ok: true, message: "API is running" });
});

async function startServer() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error.message);
        process.exit(1);
    }
}

startServer();