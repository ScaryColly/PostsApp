import mongoose, { Schema, type Model } from "mongoose";

export interface IPost {
  createdBy: string;
  title: string;
  content: string;
  image?: string | null;
  createdAt?: Date;
}

const PostSchema = new Schema<IPost>(
  {
    createdBy: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const Post: Model<IPost> = mongoose.models.Post
  ? (mongoose.models.Post as Model<IPost>)
  : mongoose.model<IPost>("Post", PostSchema);
