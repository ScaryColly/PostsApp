import mongoose, { Schema, type Model } from "mongoose";

export interface IComment {
  postId: string;
  senderId: string;
  message: string;
}

const CommentSchema = new Schema<IComment>(
  {
    postId: { type: String, required: true },
    senderId: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const CommentModel: Model<IComment> =
  mongoose.models.Comment
    ? (mongoose.models.Comment as Model<IComment>)
    : mongoose.model<IComment>("Comment", CommentSchema);

export default CommentModel;
