import { isAdminAuthorized } from "@/lib/admin-auth";
import { getDatabase, isDemo } from "@/lib/store";
import { gifts } from "@/lib/gifts";
export const runtime = "nodejs";
export async function GET(request: Request) {
  if (!isAdminAuthorized(request))
    return Response.json(
      { error: "Clave de organización incorrecta o sin configurar." },
      { status: 401 },
    );
  const db = getDatabase();
  try {
    const demo = isDemo() ? 1 : 0;
    const total = db
      .prepare(
        "SELECT count(*) AS count FROM ballots b JOIN members m ON m.id=b.member_id WHERE m.demo=?",
      )
      .get(demo)!.count;
    const results = gifts
      .map((g) => ({
        ...g,
        votes: db
          .prepare(
            "SELECT count(*) AS count FROM choices c JOIN ballots b ON b.id=c.ballot_id JOIN members m ON m.id=b.member_id WHERE m.demo=? AND c.gift_id=?",
          )
          .get(demo, g.id)!.count,
      }))
      .sort((a, b) => Number(b.votes) - Number(a.votes));
    const voters = db
      .prepare(
        "SELECT m.name FROM ballots b JOIN members m ON m.id=b.member_id WHERE m.demo=?",
      )
      .all(demo)
      .map((row) => ({ name: String(row.name) }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
      );
    return Response.json(
      {
        voters,
        total,
        results,
        demo: !!demo,
        open: process.env.VOTING_OPEN !== "false",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    db.close();
  }
}
