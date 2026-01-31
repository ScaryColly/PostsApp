import mongoose, { Schema, type Model } from "mongoose";

export interface IPost {
  senderId: string;
  title: string;
  content: string;
}

const PostSchema = new Schema<IPost>(
  {
    senderId: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const PostModel: Model<IPost> =
  mongoose.models.Post
    ? (mongoose.models.Post as Model<IPost>)
    : mongoose.model<IPost>("Post", PostSchema);

export default PostModel;
