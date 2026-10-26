import { isAdminAuthorized } from "@/lib/admin-auth";
import { isAllowedOrigin } from "@/lib/request-origin";
import {
  getDatabase,
  isDemo,
  getAdminVote,
  deleteVote,
  VoteError,
} from "@/lib/store";
import { gifts } from "@/lib/gifts";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
async function handle(request: Request, remove: boolean) {
  if (!isAdminAuthorized(request))
    return Response.json(
      { error: "Clave de organización incorrecta o sin configurar." },
      { status: 401, headers },
    );
  if (remove && !isAllowedOrigin(request))
    return Response.json(
      { error: "Solicitud no permitida." },
      { status: 403, headers },
    );
  let payload;
  if (remove) {
    try {
      payload = await request.json();
    } catch {
      return Response.json(
        { error: "Solicitud inválida." },
        { status: 400, headers },
      );
    }
    if (!payload || typeof payload !== "object")
      return Response.json(
        { error: "Solicitud inválida." },
        { status: 400, headers },
      );
  }
  const db = getDatabase();
  try {
    const vote = remove
      ? deleteVote(db, payload.ballotId, payload.confirmed, isDemo())
      : getAdminVote(
          db,
          new URL(request.url).searchParams.get("ballotId"),
          isDemo(),
        );
    return Response.json(
      {
        id: vote.id,
        name: vote.name,
        gifts: gifts
          .filter((gift) => vote.giftIds.includes(gift.id))
          .map(({ id, name }) => ({ id, name })),
      },
      { headers },
    );
  } catch (error) {
    if (error instanceof VoteError)
      return Response.json(
        { error: error.message },
        { status: error.status, headers },
      );
    console.error("No se pudo procesar el voto", error);
    return Response.json(
      { error: "No se pudo procesar el voto. Intenta nuevamente." },
      { status: 500, headers },
    );
  } finally {
    db.close();
  }
}
export async function GET(request: Request) {
  return handle(request, false);
}
export async function DELETE(request: Request) {
  return handle(request, true);
}
