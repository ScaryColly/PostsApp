import "dotenv/config";
import express, { type Express, type Request, type Response } from "express";
import mongoose from "mongoose";
import { specs, swaggerUi } from "./swagger";

import postRoutes from "./routes/posts";
import commentRoutes from "./routes/comments";
import userRoutes from "./routes/users";

const intApp = (): Promise<Express> => {
  const app = express();

  const promise = new Promise<Express>((resolve, reject) => {
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

    app.use("/post", postRoutes);
    app.use("/comments", commentRoutes);
    app.use("/users", userRoutes);

    app.get("/", (_req: Request, res: Response) => {
      res.json({ ok: true, message: "API is running" });
    });

    const dbUri = process.env.MONGO_URI;
    if (!dbUri) {
      reject(new Error("MONGO_URI is not defined"));
      return;
    }

    mongoose
      .connect(dbUri)
      .then(() => resolve(app))
      .catch((err) => reject(err));

    const db = mongoose.connection;
    db.on("error", (error) => console.error(error));
    db.once("open", () => console.log("Connected to MongoDB"));
  });

  return promise;
};

export default intApp;
