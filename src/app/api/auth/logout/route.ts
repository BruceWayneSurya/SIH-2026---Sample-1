import { endSession, redirectTo } from "@/server/auth/session";

export async function GET() {
  await endSession();
  return redirectTo("/");
}

export async function POST() {
  await endSession();
  return Response.json({ ok: true, redirect: "/" });
}
