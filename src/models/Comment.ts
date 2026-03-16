import mongoose, { Schema, type Model } from "mongoose";

export interface IComment {
  postId: string;
  createdBy: string;
  message: string;
}

const CommentSchema = new Schema<IComment>(
  {
    postId: { type: String, required: true },
    createdBy: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true },
);

export const Comment: Model<IComment> = mongoose.models.Comment
  ? (mongoose.models.Comment as Model<IComment>)
  : mongoose.model<IComment>("Comment", CommentSchema);
