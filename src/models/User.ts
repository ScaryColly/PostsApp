import bcrypt from "bcrypt";
import mongoose, { Schema, type Document, type Model } from "mongoose";

export type AuthProvider = "local" | "google";

export interface IUser extends Document {
  username: string;
  email?: string;
  password?: string;
  profileImage?: string;
  authProvider: AuthProvider;
  providerId?: string;
  refreshTokens: string[];
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
      default: undefined,
      set: (value: unknown) => {
        if (value === null || value === undefined) {
          return undefined;
        }

        const normalized = String(value).trim();
        return normalized.length === 0 ? undefined : normalized;
      },
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.authProvider === "local";
      },
      minlength: 6,
    },
    profileImage: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    providerId: {
      type: String,
      default: null,
    },
    refreshTokens: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

UserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string" },
    },
  },
);

UserSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password") || !this.password) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function (
  password: string,
): Promise<boolean> {
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(password, this.password);
};

export const User: Model<IUser> = mongoose.models.User
  ? (mongoose.models.User as Model<IUser>)
  : mongoose.model<IUser>("User", UserSchema);
