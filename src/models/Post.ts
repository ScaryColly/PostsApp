import mongoose, { Schema, type Model } from "mongoose";

export interface IPost {
  senderId: string;
  title: string;
  content: string;
  createdBy?: string;
}

const PostSchema = new Schema<IPost>(
  {
    senderId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true },
);

export const Post: Model<IPost> = mongoose.models.Post
  ? (mongoose.models.Post as Model<IPost>)
  : mongoose.model<IPost>("Post", PostSchema);
