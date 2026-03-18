import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Posts & Comments REST API",
      version: "1.0.0",
      description: "A REST API for managing posts and comments",
      contact: {
        name: "Your Name",
        email: "developer@example.com",
      },
    },
    servers: [
      {
        url: process.env.BASE_URL || "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT Authorization header using the Bearer scheme",
        },
      },
      schemas: {
        User: {
          type: "object",
          required: ["username", "email"],
          properties: {
            _id: { type: "string", example: "69665a97012d745083da47e3" },
            username: { type: "string", example: "john_doe", minLength: 3 },
            email: { type: "string", example: "john@example.com" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "69665a97012d745083da47e3" },
            username: { type: "string", example: "john_doe" },
            email: { type: "string", example: "john@example.com" },
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            },
          },
        },
        Post: {
          type: "object",
          required: ["senderId", "title", "content"],
          properties: {
            _id: { type: "string", example: "69665a97012d745083da47e3" },
            senderId: { type: "string", example: "user1" },
            title: { type: "string", example: "Post A" },
            content: { type: "string", example: "Content A" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Comment: {
          type: "object",
          required: ["postId", "senderId", "message"],
          properties: {
            _id: { type: "string", example: "69665aa7012d745083da47e7" },
            postId: { type: "string", example: "69665a97012d745083da47e4" },
            senderId: { type: "string", example: "user1" },
            message: { type: "string", example: "Nice post!" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Invalid post id" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
