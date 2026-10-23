import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID, randomInt, createHash } from "node:crypto";
import { receiptWords } from "./receipt-words.ts";
export function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function openDatabase(
  path = process.env.DATABASE_PATH || "./data/votacion.sqlite",
) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,name TEXT NOT NULL,search_name TEXT NOT NULL,demo INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS ballots(id TEXT PRIMARY KEY,member_id TEXT NOT NULL UNIQUE REFERENCES members(id),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS choices(ballot_id TEXT NOT NULL REFERENCES ballots(id),gift_id INTEGER NOT NULL CHECK(gift_id BETWEEN 1 AND 7),PRIMARY KEY(ballot_id,gift_id));
 CREATE TABLE IF NOT EXISTS receipts(ballot_id TEXT PRIMARY KEY REFERENCES ballots(id),word TEXT NOT NULL,demo INTEGER NOT NULL CHECK(demo IN (0,1)),UNIQUE(demo,word));`);
  return db;
}
export function getDatabase() {
  return openDatabase();
}
export function isDemo() {
  return process.env.DEMO_MODE === "true";
}
export class VoteError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export function submitVote(
  db: DatabaseSync,
  memberId: unknown,
  selected: unknown,
  demo: boolean,
) {
  if (
    typeof memberId !== "string" ||
    !Array.isArray(selected) ||
    selected.length < 1 ||
    selected.length > 2 ||
    new Set(selected).size !== selected.length ||
    selected.some((x) => !Number.isInteger(x) || x < 1 || x > 7)
  )
    throw new VoteError("Selecciona uno o dos regalos válidos.", 400);
  db.exec("BEGIN IMMEDIATE");
  try {
    const member = db
      .prepare("SELECT id FROM members WHERE id=? AND demo=?")
      .get(memberId, demo ? 1 : 0);
    if (!member) throw new VoteError("Selecciona un socio de la nómina.", 400);
    if (db.prepare("SELECT id FROM ballots WHERE member_id=?").get(memberId))
      throw new VoteError(
        "Este socio ya registró su voto. Si no fuiste tú, comunícate con la organización.",
        409,
      );
    const used = new Set(
      db
        .prepare("SELECT word FROM receipts WHERE demo=?")
        .all(demo ? 1 : 0)
        .map((row) => String(row.word)),
    );
    const available = receiptWords.filter((word) => !used.has(word));
    if (!available.length)
      throw new VoteError(
        "Se agotaron las 200 palabras de comprobante. Comunícate con la organización.",
        409,
      );
    const receipt = available[randomInt(available.length)];
    const id = randomUUID();
    db.prepare("INSERT INTO ballots(id,member_id) VALUES(?,?)").run(
      id,
      memberId,
    );
    db.prepare("INSERT INTO receipts(ballot_id,word,demo) VALUES(?,?,?)").run(
      id,
      receipt,
      demo ? 1 : 0,
    );
    for (const gift of selected)
      db.prepare("INSERT INTO choices(ballot_id,gift_id) VALUES(?,?)").run(
        id,
        gift,
      );
    db.exec("COMMIT");
    return receipt;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function submitNamedVote(
  db: DatabaseSync,
  firstName: unknown,
  lastName: unknown,
  selected: unknown,
  confirmed: unknown,
  demo: boolean,
) {
  const valid = (v: unknown): v is string =>
    typeof v === "string" &&
    v.trim().length >= 2 &&
    v.length <= 100 &&
    /^[\p{L}\p{M} '’-]+$/u.test(v) &&
    normalize(v).length >= 2;
  if (!valid(firstName) || !valid(lastName) || confirmed !== true)
    throw new VoteError(
      "Escribe correctamente tu nombre y apellidos, y confirma tu identidad.",
      400,
    );
  const name = `${firstName.trim().replace(/\s+/g, " ")} ${lastName.trim().replace(/\s+/g, " ")}`;
  const key = normalize(name);
  const id =
    (demo ? "demo-" : "socio-") +
    createHash("sha256").update(key).digest("hex");
  db.prepare(
    "INSERT OR IGNORE INTO members(id,name,search_name,demo) VALUES(?,?,?,?)",
  ).run(id, name, key, demo ? 1 : 0);
  return submitVote(db, id, selected, demo);
}

export function lookupReceipt(db: DatabaseSync, input: unknown, demo: boolean) {
  if (typeof input !== "string" || input.length > 100)
    throw new VoteError("Ingresa la palabra de comprobante.", 400);
  const word = normalize(input);
  if (!/^[a-z]+$/.test(word))
    throw new VoteError("Ingresa una sola palabra de comprobante.", 400);
  const ballot = db
    .prepare(
      "SELECT b.id, m.name FROM receipts r JOIN ballots b ON b.id=r.ballot_id JOIN members m ON m.id=b.member_id WHERE r.word=? AND r.demo=? AND m.demo=?",
    )
    .get(word, demo ? 1 : 0, demo ? 1 : 0);
  if (!ballot) return null;
  const giftIds = db
    .prepare("SELECT gift_id FROM choices WHERE ballot_id=? ORDER BY gift_id")
    .all(ballot.id)
    .map((row) => Number(row.gift_id));
  return { name: String(ballot.name), giftIds };
}

export function verifyPublicVote(
  db: DatabaseSync,
  fullName: unknown,
  word: unknown,
  demo: boolean,
) {
  if (
    typeof fullName !== "string" ||
    fullName.length > 205 ||
    normalize(fullName).length < 4
  )
    throw new VoteError("Ingresa tu nombre y apellido.", 400);
  if (
    typeof word !== "string" ||
    word.length > 100 ||
    !/^[a-z]+$/.test(normalize(word))
  )
    throw new VoteError("Ingresa la palabra clave de tu comprobante.", 400);
  return !!db
    .prepare(
      "SELECT 1 FROM receipts r JOIN ballots b ON b.id=r.ballot_id JOIN members m ON m.id=b.member_id WHERE r.word=? AND r.demo=? AND m.demo=? AND m.search_name=?",
    )
    .get(normalize(word), demo ? 1 : 0, demo ? 1 : 0, normalize(fullName));
}
