import { getDatabase, isDemo, verifyPublicVote, VoteError } from "@/lib/store";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return Response.json(
      { error: "Solicitud no permitida." },
      { status: 403, headers },
    );
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      {
        error:
          "Ingresa tu nombre y apellido y la palabra clave del comprobante.",
      },
      { status: 400, headers },
    );
  }
  if (!payload || typeof payload !== "object")
    return Response.json(
      {
        error:
          "Ingresa tu nombre y apellido y la palabra clave del comprobante.",
      },
      { status: 400, headers },
    );
  const db = getDatabase();
  try {
    return Response.json(
      {
        found: verifyPublicVote(db, payload.fullName, payload.word, isDemo()),
      },
      { headers },
    );
  } catch (e) {
    if (e instanceof VoteError)
      return Response.json({ error: e.message }, { status: e.status, headers });
    console.error("Error al verificar voto", e);
    return Response.json(
      { error: "No pudimos consultar tu voto. Intenta nuevamente." },
      { status: 500, headers },
    );
  } finally {
    db.close();
  }
}
