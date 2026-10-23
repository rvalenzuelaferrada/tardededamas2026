import { timingSafeEqual } from "node:crypto";

export function isAdminAuthorized(request: Request) {
  const expected = process.env.ADMIN_TOKEN;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  return (
    !!expected &&
    Buffer.byteLength(provided) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  );
}
