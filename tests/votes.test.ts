import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDatabase, submitNamedVote, VoteError } from "../lib/store.ts";
function database() {
  const dir = mkdtempSync(join(tmpdir(), "damas-test-"));
  const db = openDatabase(join(dir, "test.sqlite"));
  return {
    db,
    close() {
      db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
test("one ballot per normalized name", () => {
  const fixture = database();
  try {
    submitNamedVote(
      fixture.db,
      "José Andrés",
      "Pérez González",
      [1, 3],
      true,
      false,
    );
    assert.throws(
      () =>
        submitNamedVote(
          fixture.db,
          " JOSE   ANDRES ",
          "PEREZ GONZALEZ",
          [2],
          true,
          false,
        ),
      (e: unknown) => e instanceof VoteError && e.status === 409,
    );
    assert.equal(
      fixture.db.prepare("SELECT count(*) AS n FROM ballots").get()!.n,
      1,
    );
    assert.equal(
      fixture.db.prepare("SELECT count(*) AS n FROM choices").get()!.n,
      2,
    );
  } finally {
    fixture.close();
  }
});
test("rejects invalid identities, consent, duplicate options, zero and more than two gifts", () => {
  const f = database();
  try {
    for (const choices of [[], [1, 2, 3], [1, 1], [0], [8], ["1"], null])
      assert.throws(
        () => submitNamedVote(f.db, "Ana", "Soto", choices, true, false),
        VoteError,
      );
    assert.throws(
      () => submitNamedVote(f.db, "Ana", "Soto", [1], false, false),
      VoteError,
    );
    assert.throws(
      () => submitNamedVote(f.db, "A", "Soto", [1], true, false),
      VoteError,
    );
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM ballots").get()!.n, 0);
  } finally {
    f.close();
  }
});
test("demo and real identities have separate ballots; one choice is allowed", () => {
  const f = database();
  try {
    submitNamedVote(f.db, "Ana", "Soto", [1], true, true);
    submitNamedVote(f.db, "Ana", "Soto", [2], true, false);
    assert.equal(f.db.prepare("SELECT count(*) AS n FROM ballots").get()!.n, 2);
  } finally {
    f.close();
  }
});
test("database uniqueness constraint blocks a second ballot directly", () => {
  const f = database();
  try {
    submitNamedVote(f.db, "Ana", "Soto", [1], true, false);
    const member = f.db.prepare("SELECT id FROM members").get()!.id;
    assert.throws(() =>
      f.db
        .prepare("INSERT INTO ballots(id,member_id) VALUES(?,?)")
        .run("duplicate", member),
    );
  } finally {
    f.close();
  }
});

test("votes survive closing and reopening the database", () => {
  const dir = mkdtempSync(join(tmpdir(), "damas-persist-"));
  const path = join(dir, "test.sqlite");
  let db = openDatabase(path);
  try {
    submitNamedVote(db, "Pedro", "Persistencia", [5, 7], true, false);
    db.close();
    db = openDatabase(path);
    assert.equal(db.prepare("SELECT count(*) AS n FROM ballots").get()!.n, 1);
    assert.equal(db.prepare("SELECT count(*) AS n FROM choices").get()!.n, 2);
    assert.throws(
      () => submitNamedVote(db, "PEDRO", "PERSISTENCIA", [1], true, false),
      VoteError,
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("200 distinct words are assigned once; exhaustion never saves an extra vote", async () => {
  const { receiptWords } = await import("../lib/receipt-words.ts");
  assert.equal(receiptWords.length, 200);
  assert.equal(new Set(receiptWords).size, 200);
  assert.ok(receiptWords.every((word) => /^[a-z]+$/.test(word)));
  const f = database();
  try {
    const assigned = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const surname = `Socio ${String.fromCharCode(65 + Math.floor(i / 26))}${String.fromCharCode(65 + (i % 26))}`;
      const receipt = submitNamedVote(
        f.db,
        "Prueba",
        surname,
        [1],
        true,
        false,
      );
      assert.ok(receiptWords.includes(receipt));
      assert.ok(!assigned.has(receipt));
      assigned.add(receipt);
    }
    assert.equal(assigned.size, 200);
    assert.throws(
      () => submitNamedVote(f.db, "Prueba", "Adicional", [2], true, false),
      (e: unknown) => e instanceof VoteError && e.message.includes("agotaron"),
    );
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM ballots").get()!.n,
      200,
    );
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM receipts").get()!.n,
      200,
    );
    assert.equal(
      f.db.prepare("SELECT count(*) AS n FROM choices").get()!.n,
      200,
    );
    // The demo pool remains available even if every real word is assigned.
    const demoReceipt = submitNamedVote(
      f.db,
      "Prueba",
      "Demostracion",
      [2],
      true,
      true,
    );
    assert.ok(receiptWords.includes(demoReceipt));
  } finally {
    f.close();
  }
});

test("receipt words persist after reopening; legacy ballots retain their original identifiers", () => {
  const dir = mkdtempSync(join(tmpdir(), "damas-receipts-"));
  const path = join(dir, "test.sqlite");
  let db = openDatabase(path);
  try {
    const word = submitNamedVote(db, "Ana", "Soto", [1], true, false);
    db.close();
    db = openDatabase(path);
    assert.equal(db.prepare("SELECT word FROM receipts").get()!.word, word);
    db.prepare(
      "INSERT INTO members(id,name,search_name,demo) VALUES(?,?,?,0)",
    ).run("legacy-member", "Socio Anterior", "socio anterior");
    db.prepare("INSERT INTO ballots(id,member_id) VALUES(?,?)").run(
      "legacy-receipt-id",
      "legacy-member",
    );
    assert.throws(() =>
      db
        .prepare("INSERT INTO receipts(ballot_id,word,demo) VALUES(?,?,?)")
        .run("legacy-receipt-id", word, 0),
    );
    db.close();
    db = openDatabase(path);
    assert.equal(
      db
        .prepare("SELECT id FROM ballots WHERE member_id=?")
        .get("legacy-member")!.id,
      "legacy-receipt-id",
    );
    assert.notEqual(
      submitNamedVote(db, "Pedro", "Soto", [2], true, false),
      word,
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("simultaneous voters receive different words across independent database connections", async () => {
  const { Worker } = await import("node:worker_threads");
  const dir = mkdtempSync(join(tmpdir(), "damas-parallel-"));
  const path = join(dir, "test.sqlite");
  const db = openDatabase(path);
  db.close();
  const storeUrl = new URL("../lib/store.ts", import.meta.url).href;
  try {
    const results = await Promise.all(
      Array.from(
        { length: 4 },
        (_, i) =>
          new Promise<string[]>((resolve, reject) => {
            const worker = new Worker(
              `
    const {parentPort,workerData}=require('node:worker_threads');
    (async()=>{
      const {openDatabase,submitNamedVote}=await import(workerData.storeUrl);
      const db=openDatabase(workerData.path);
      try {
       const receipts=[];
       for(let j=0;j<5;j++) receipts.push(submitNamedVote(db,'Concurrente','Socio '+String.fromCharCode(65+workerData.i)+String.fromCharCode(65+j),[1,2],true,false));
       db.close();parentPort.postMessage(receipts);
      }catch(e){db.close();throw e;}
    })();`,
              { eval: true, workerData: { storeUrl, path, i } },
            );
            worker.once("message", resolve);
            worker.once("error", reject);
            worker.once("exit", (code) => {
              if (code !== 0) reject(new Error(`Worker exited with ${code}`));
            });
          }),
      ),
    );
    assert.equal(results.flat().length, 20);
    assert.equal(new Set(results.flat()).size, 20);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
