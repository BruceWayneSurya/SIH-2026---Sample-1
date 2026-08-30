import type { Request, Response } from "express";
import {
  makeSessionToken,
  sessionSetCookie,
} from "../auth/session";

export function startLoginSession(
  req: Request,
  res: Response,
  user: { id: number; role: "student" | "faculty" },
  maxAgeSec = 60 * 60 * 24 * 14,
): void {
  const token = makeSessionToken(user, maxAgeSec);
  res.setHeader("Set-Cookie", sessionSetCookie(req, token, maxAgeSec));
}

export function setSessionCookie(
  req: Request,
  res: Response,
  token: string,
  maxAgeSec = 60 * 60 * 24 * 14,
): void {
  res.setHeader("Set-Cookie", sessionSetCookie(req, token, maxAgeSec));
}

export function clearSessionCookie(req: Request, res: Response): void {
  const maxAgeSec = 0;
  const token = "";
  res.setHeader("Set-Cookie", sessionSetCookie(req, token, maxAgeSec));
}

export function redirectWithSession(
  req: Request,
  res: Response,
  path: string,
  user: { id: number; role: "student" | "faculty" },
  maxAgeSec = 60 * 60 * 24 * 14,
): void {
  const token = makeSessionToken(user, maxAgeSec);
  res.setHeader("Set-Cookie", sessionSetCookie(req, token, maxAgeSec));
  res.redirect(303, path);
}
