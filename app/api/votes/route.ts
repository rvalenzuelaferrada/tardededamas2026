import { isAllowedOrigin } from "@/lib/request-origin";
import { getDatabase, isDemo, submitNamedVote, VoteError } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isAllowedOrigin(request))
    return Response.json({ error: "Solicitud no permitida." }, { status: 403 });
  if (process.env.VOTING_OPEN === "false")
    return Response.json(
      { error: "La votación está cerrada." },
      { status: 403 },
    );
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object")
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  const db = getDatabase();
  try {
    const receipt = submitNamedVote(
      db,
      payload.firstName,
      payload.lastName,
      payload.giftIds,
      payload.confirmed,
      isDemo(),
    );
    return Response.json({ receipt, demo: isDemo() });
  } catch (e) {
    if (e instanceof VoteError)
      return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json(
      { error: "No pudimos registrar tu voto. Intenta nuevamente." },
      { status: 500 },
    );
  } finally {
    db.close();
  }
}
