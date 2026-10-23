import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedOrigin } from "../lib/request-origin.ts";

test("origin validation accepts the public HTTPS origin behind an internal HTTP proxy", () => {
  const old = process.env.APP_ORIGIN;
  delete process.env.APP_ORIGIN;
  try {
    const make = (origin: string) =>
      new Request("http://localhost:3000/api/votes", {
        headers: {
          origin,
          host: "localhost:3000",
          "x-forwarded-host": "votacion.clubdeoratoria.cl",
          "x-forwarded-proto": "https",
        },
      });
    assert.equal(
      isAllowedOrigin(make("https://votacion.clubdeoratoria.cl")),
      true,
    );
    for (const origin of [
      "https://otro.cl",
      "https://votacion.clubdeoratoria.cl.ejemplo.cl",
      "http://votacion.clubdeoratoria.cl",
      "null",
    ])
      assert.equal(isAllowedOrigin(make(origin)), false);
    assert.equal(
      isAllowedOrigin(
        new Request("http://localhost:3000/api/votes", {
          headers: {
            origin: "https://votacion.clubdeoratoria.cl",
            host: "votacion.clubdeoratoria.cl",
            "x-forwarded-proto": "https",
          },
        }),
      ),
      true,
    );
  } finally {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  }
});
test("explicit public origin takes precedence over internal URLs and forwarded headers", () => {
  const old = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://votacion.clubdeoratoria.cl";
  try {
    assert.equal(
      isAllowedOrigin(
        new Request("http://internal:3000/api/votes", {
          headers: { origin: "https://votacion.clubdeoratoria.cl" },
        }),
      ),
      true,
    );
    assert.equal(
      isAllowedOrigin(
        new Request("http://internal:3000/api/votes", {
          headers: {
            origin: "https://otro.cl",
            "x-forwarded-host": "otro.cl",
            "x-forwarded-proto": "https",
          },
        }),
      ),
      false,
    );
  } finally {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  }
});
test("local development, absent origin, invalid origins and proxy headers", () => {
  const old = process.env.APP_ORIGIN;
  delete process.env.APP_ORIGIN;
  try {
    assert.equal(
      isAllowedOrigin(
        new Request("http://localhost:3000/api/votes", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
      true,
    );
    assert.equal(
      isAllowedOrigin(new Request("http://localhost:3000/api/votes")),
      true,
    );
    assert.equal(
      isAllowedOrigin(
        new Request("http://localhost:3000/api/votes", {
          headers: { origin: "not-a-url" },
        }),
      ),
      false,
    );
    assert.equal(
      isAllowedOrigin(
        new Request("http://localhost:3000/api/votes", {
          headers: {
            origin: "https://otro.cl",
            "x-forwarded-host": "internal@otro.cl",
            "x-forwarded-proto": "https",
          },
        }),
      ),
      false,
    );
  } finally {
    if (old === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = old;
  }
});
