export type PostSeed = {
  createdBy: string;
  title: string;
  content: string;
  _id?: string;
};

export const postsData: PostSeed[] = [
  {
    createdBy: "507f1f77bcf86cd799439011",
    title: "Post A",
    content: "Content A",
  },
  {
    createdBy: "507f1f77bcf86cd799439011",
    title: "Post B",
    content: "Content B",
  },
  {
    createdBy: "507f191e810c19729de860ea",
    title: "Post C",
    content: "Content C",
  },
];

export type CommentSeed = {
  postId: string;
  createdBy: string;
  message: string;
  createdAt?: Date;
  _id?: string;
};

export const commentsData: CommentSeed[] = [
  {
    postId: "post1",
    createdBy: "507f1f77bcf86cd799439011",
    message: "first",
  },
  {
    postId: "post1",
    createdBy: "507f1f77bcf86cd799439011",
    message: "second",
  },
  {
    postId: "post2",
    createdBy: "507f191e810c19729de860ea",
    message: "nice post",
  },
];
