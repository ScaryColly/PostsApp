import mongoose, { Schema, type Model, type Document } from "mongoose";
import bcrypt from "bcrypt";

export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    refreshTokens?: string[];
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
            required: true,
            unique: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        password: {
            type: String,
            required: true,
            minlength: 6,
        },
        refreshTokens: {
            type: [String],
            default: [],
        },
    },
    { timestamps: true }
);

UserSchema.pre<IUser>("save", async function () {
    if (!this.isModified("password")) {
        return;
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err;
    }
});

UserSchema.methods.comparePassword = async function (
    password: string
): Promise<boolean> {
    return bcrypt.compare(password, this.password);
};

const UserModel: Model<IUser> =
    mongoose.models.User
        ? (mongoose.models.User as Model<IUser>)
        : mongoose.model<IUser>("User", UserSchema);

export default UserModel;
