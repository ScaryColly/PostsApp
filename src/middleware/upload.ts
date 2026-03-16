import fs from "fs";
import multer from "multer";
import path from "path";

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(new Error("Only image files are allowed"));
};

const createImageUpload = (directoryName: string) => {
  const uploadsDir = path.join(process.cwd(), "uploads", directoryName);

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path
        .basename(file.originalname, ext)
        .replace(/\s+/g, "-");
      cb(null, `${Date.now()}-${baseName}${ext}`);
    },
  });

  return multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
};

export const profileImageUpload = createImageUpload("profiles");
export const postImageUpload = createImageUpload("posts");
