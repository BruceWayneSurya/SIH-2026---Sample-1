import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import authRoutes from "./routes/auth";
import dataRoutes from "./routes/data";
import notesRoutes from "./routes/notes";
import objectiveRoutes from "./routes/objective";
import subjectiveRoutes from "./routes/subjective";
import healthRoutes from "./routes/health";

const app = express();

// The frontend is served separately and talks to this API over HTTP. When the
// frontend proxies /api via Next rewrites it is same-origin (no CORS needed),
// but we still allow cross-origin calls with credentials for direct use.
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve note-file uploads (the frontend proxies /uploads/* to this server).
const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

app.use("/api/auth", authRoutes);
app.use("/api", dataRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/objective", objectiveRoutes);
app.use("/api/subjective", subjectiveRoutes);
app.use("/api", healthRoutes);

// Not-found for unmatched API routes.
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

export default app;
