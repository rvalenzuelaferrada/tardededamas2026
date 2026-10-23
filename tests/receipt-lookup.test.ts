import { test } from "node:test";
import assert from "node:assert/strict";
import {
  openDatabase,
  submitNamedVote,
  lookupReceipt,
  VoteError,
} from "../lib/store.ts";
import { isAdminAuthorized } from "../lib/admin-auth.ts";

test("receipt lookup reveals only the vote matching the entered word", () => {
  const db = openDatabase(":memory:");
  try {
    const word = submitNamedVote(db, "Ana", "Soto", [2, 5], true, false);
    const another = submitNamedVote(db, "Pedro", "Perez", [7], true, false);
    assert.deepEqual(lookupReceipt(db, `  ${word.toUpperCase()}  `, false), {
      name: "Ana Soto",
      giftIds: [2, 5],
    });
    assert.deepEqual(lookupReceipt(db, another, false), {
      name: "Pedro Perez",
      giftIds: [7],
    });
    assert.equal(lookupReceipt(db, "inexistente", false), null);
    assert.equal(lookupReceipt(db, word, true), null);
  } finally {
    db.close();
  }
});
test("receipt lookup rejects empty words, lists and invalid inputs", () => {
  const db = openDatabase(":memory:");
  try {
    for (const value of [
      "",
      "  ",
      "brisa luna",
      null,
      ["brisa"],
      {},
      "a".repeat(101),
    ])
      assert.throws(() => lookupReceipt(db, value, false), VoteError);
  } finally {
    db.close();
  }
});
test("organization authorization requires the configured private key", () => {
  const previous = process.env.ADMIN_TOKEN;
  try {
    process.env.ADMIN_TOKEN = "test-organization-secret";
    assert.equal(isAdminAuthorized(new Request("http://localhost")), false);
    assert.equal(
      isAdminAuthorized(
        new Request("http://localhost", {
          headers: { Authorization: "Bearer wrong" },
        }),
      ),
      false,
    );
    assert.equal(
      isAdminAuthorized(
        new Request("http://localhost", {
          headers: { Authorization: "Bearer test-organization-secret" },
        }),
      ),
      true,
    );
    process.env.ADMIN_TOKEN = "";
    assert.equal(isAdminAuthorized(new Request("http://localhost")), false);
  } finally {
    if (previous === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = previous;
  }
});

test("public lookup requires matching name and receipt word and returns only status", async () => {
  const { verifyPublicVote } = await import("../lib/store.ts");
  const db = openDatabase(":memory:");
  try {
    const word = submitNamedVote(db, "José", "Pérez", [1, 3], true, false);
    assert.equal(
      verifyPublicVote(db, " JOSE   PEREZ ", word.toUpperCase(), false),
      true,
    );
    assert.equal(verifyPublicVote(db, "Otra Persona", word, false), false);
    assert.equal(
      verifyPublicVote(db, "José Pérez", "inexistente", false),
      false,
    );
    assert.equal(verifyPublicVote(db, "José Pérez", word, true), false);
    assert.throws(
      () => verifyPublicVote(db, "José Pérez", undefined, false),
      VoteError,
    );
    assert.throws(
      () => verifyPublicVote(db, "José Pérez", "", false),
      VoteError,
    );
    assert.throws(() => verifyPublicVote(db, "", word, false), VoteError);
  } finally {
    db.close();
  }
});
