export type PostSeed = {
  senderId: string;
  title: string;
  content: string;
  _id?: string;
};

export const postsData: PostSeed[] = [
  { senderId: "user1", title: "Post A", content: "Content A" },
  { senderId: "user1", title: "Post B", content: "Content B" },
  { senderId: "user2", title: "Post C", content: "Content C" }
];

export type CommentSeed = {
  postId: string;
  senderId: string;
  message: string;
  createdAt?: Date;
  _id?: string;
};

export const commentsData: CommentSeed[] = [
  {
    postId: "post1",
    senderId: "user1",
    message: "first",
  },
  {
    postId: "post1",
    senderId: "user1",
    message: "second",
  },
  {
    postId: "post2",
    senderId: "user2",
    message: "nice post",
  },
];

