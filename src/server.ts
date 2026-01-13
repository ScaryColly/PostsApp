import "dotenv/config";
import intApp from "./index";

const PORT = process.env.PORT || 3000;

intApp()
  .then((app) => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Failed to start server:", msg);
    process.exit(1);
  });
