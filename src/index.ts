import { app } from "./app.js";
import { migrate } from "./db/migrate.js";

const port = Number(process.env["PORT"] ?? 3000);

async function bootstrap(): Promise<void> {
  // Run DB migrations BEFORE accepting HTTP requests
  await migrate();

  app.listen(port, () => {
    console.log(`[Server] API started on http://localhost:${port}`);
    console.log(`[Server] Swagger UI: http://localhost:${port}/api-docs`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
