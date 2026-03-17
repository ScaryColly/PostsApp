import mongoose, { Schema, type Model } from "mongoose";

export interface IPostLike {
  postId: string;
  userId: string;
}

const PostLikeSchema = new Schema<IPostLike>(
  {
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostLike: Model<IPostLike> = mongoose.models.PostLike
  ? (mongoose.models.PostLike as Model<IPostLike>)
  : mongoose.model<IPostLike>("PostLike", PostLikeSchema);
