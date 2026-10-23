import { isAdminAuthorized } from "@/lib/admin-auth";
import { getDatabase, isDemo, lookupReceipt, VoteError } from "@/lib/store";
import { gifts } from "@/lib/gifts";
export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  if (!isAdminAuthorized(request))
    return Response.json(
      { error: "Clave de organización incorrecta o sin configurar." },
      { status: 401, headers },
    );
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { error: "Ingresa una palabra de comprobante válida." },
      { status: 400, headers },
    );
  }
  if (!payload || typeof payload !== "object")
    return Response.json(
      { error: "Ingresa una palabra de comprobante válida." },
      { status: 400, headers },
    );
  const db = getDatabase();
  try {
    const vote = lookupReceipt(db, payload.word, isDemo());
    if (!vote) return Response.json({ found: false }, { headers });
    return Response.json(
      {
        found: true,
        name: vote.name,
        gifts: gifts
          .filter((g) => vote.giftIds.includes(g.id))
          .map((g) => ({ id: g.id, name: g.name })),
      },
      { headers },
    );
  } catch (e) {
    if (e instanceof VoteError)
      return Response.json({ error: e.message }, { status: e.status, headers });
    console.error("No se pudo consultar el comprobante", e);
    return Response.json(
      { error: "No se pudo consultar el comprobante. Intenta nuevamente." },
      { status: 500, headers },
    );
  } finally {
    db.close();
  }
}
