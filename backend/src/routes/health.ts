import { Router } from "express";
import { sqlite } from "../db";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    sqlite.exec("select 1");
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ ok: false });
  }
});

export default router;
