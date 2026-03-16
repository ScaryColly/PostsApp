import mongoose, { Schema, type Model } from "mongoose";

export interface IPost {
  createdBy: string;
  title: string;
  content: string;
}

const PostSchema = new Schema<IPost>(
  {
    createdBy: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

export const Post: Model<IPost> = mongoose.models.Post
  ? (mongoose.models.Post as Model<IPost>)
  : mongoose.model<IPost>("Post", PostSchema);
