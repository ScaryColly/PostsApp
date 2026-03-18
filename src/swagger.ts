import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const normalizeBasePath = (basePath: string): string => {
  const trimmed = basePath.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "");
};

const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const swaggerApiBasePath =
  process.env.SWAGGER_API_BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/api" : "");
const apiBasePath = normalizeBasePath(swaggerApiBasePath);

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Posts & Comments REST API",
      version: "1.0.0",
      description: "A REST API for managing users, posts and comments",
    },
    servers: [
      {
        url: `${baseUrl}${apiBasePath}`,
        description:
          process.env.NODE_ENV === "production"
            ? "Production API"
            : "Development server",
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string", example: "67d1234567890abcdef1234" },
            username: { type: "string", example: "john_doe" },
            email: { type: "string", example: "john@example.com" },
            profileImage: {
              type: "string",
              nullable: true,
              example: "/uploads/profiles/1742055000-avatar.png",
            },
            authProvider: {
              type: "string",
              example: "local",
              enum: ["local", "google"],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        AuthResponse: {
          type: "object",
          properties: {
            _id: { type: "string", example: "67d1234567890abcdef1234" },
            username: { type: "string", example: "john_doe" },
            email: { type: "string", example: "john@example.com" },
            profileImage: {
              type: "string",
              nullable: true,
              example: "/uploads/profiles/1742055000-avatar.png",
            },
            authProvider: {
              type: "string",
              example: "local",
              enum: ["local", "google"],
            },
            accessToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.token",
            },
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.token",
            },
          },
        },

        RefreshTokenRequest: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
              example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.token",
            },
          },
        },

        GoogleAuthRequest: {
          type: "object",
          required: ["idToken"],
          properties: {
            idToken: {
              type: "string",
              example: "google-id-token",
            },
          },
        },

        UpdateCurrentUserFormData: {
          type: "object",
          properties: {
            username: {
              type: "string",
              example: "new_username",
            },
            profileImage: {
              type: "string",
              format: "binary",
            },
          },
        },

        Post: {
          type: "object",
          required: ["createdBy", "title", "content"],
          properties: {
            _id: { type: "string", example: "69665a97012d745083da47e3" },
            createdBy: {
              oneOf: [
                { type: "string", example: "507f1f77bcf86cd799439011" },
                { $ref: "#/components/schemas/User" },
              ],
            },
            title: { type: "string", example: "Post A" },
            content: { type: "string", example: "Content A" },
            image: {
              type: "string",
              nullable: true,
              example: "/uploads/posts/1742055000-post.png",
            },
            likes: {
              type: "array",
              items: { type: "string", example: "507f1f77bcf86cd799439011" },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        PostLikeRequest: {
          type: "object",
          required: ["userId"],
          properties: {
            userId: { type: "string", example: "507f1f77bcf86cd799439011" },
          },
        },

        PostLikeResponse: {
          type: "object",
          properties: {
            ok: { type: "boolean", example: true },
            likes: {
              type: "array",
              items: { type: "string", example: "507f1f77bcf86cd799439011" },
            },
          },
        },

        Comment: {
          type: "object",
          required: ["postId", "createdBy", "message"],
          properties: {
            _id: { type: "string", example: "69665aa7012d745083da47e7" },
            postId: { type: "string", example: "69665a97012d745083da47e4" },
            createdBy: {
              oneOf: [
                { type: "string", example: "507f1f77bcf86cd799439011" },
                { $ref: "#/components/schemas/User" },
              ],
            },
            message: { type: "string", example: "Nice post!" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Invalid request" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
