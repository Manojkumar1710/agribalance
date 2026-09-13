import app from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";

try {
  await connectDatabase();
  app.listen(env.port, () =>
    console.log(`AgriBalance API listening on http://localhost:${env.port}`),
  );
} catch {
  console.error(
    "Server startup aborted because MongoDB could not be connected.",
  );
  process.exit(1);
}
