"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
export default function ReceiptLookup() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [fullName, setFullName] = useState(""),
    [word, setWord] = useState(""),
    [found, setFound] = useState<boolean | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (busy) return;
    const message = error
      ? errorRef.current
      : found !== null
        ? resultRef.current
        : null;
    message?.scrollIntoView({ block: "nearest", behavior: "instant" });
    message?.focus({ preventScroll: true });
  }, [found, error, busy]);
  function clearResult() {
    setFound(null);
    setError("");
  }
  function close() {
    dialogRef.current?.close();
    setFullName("");
    setWord("");
    clearResult();
  }
  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    clearResult();
    setBusy(true);
    try {
      const response = await fetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ fullName, word }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No pudimos consultar tu voto.");
      setFound(result.found);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No hay conexión. Intenta nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="public-receipt-trigger"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Search size={22} /> Consultar mi voto
      </button>
      <dialog
        className="public-receipt-modal"
        ref={dialogRef}
        aria-labelledby="public-receipt-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else close();
        }}
      >
        <div className="modal-header">
          <span>Consulta de voto</span>
          <button className="close-modal" disabled={busy} onClick={close}>
            <X size={23} /> Cerrar
          </button>
        </div>
        <h2 id="public-receipt-title">¿Quedó registrado tu voto?</h2>
        <p>
          Ingresa tu nombre y apellido y la palabra clave de tu comprobante.
        </p>
        <form className="public-receipt-form" onSubmit={lookup}>
          <label>
            Nombre y apellido
            <input
              autoComplete="name"
              required
              minLength={4}
              maxLength={205}
              disabled={busy}
              value={fullName}
              placeholder="Por ejemplo: Juan Pérez"
              onChange={(event) => {
                setFullName(event.target.value);
                clearResult();
              }}
            />
          </label>
          <label>
            Palabra clave del comprobante
            <input
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={100}
              disabled={busy}
              value={word}
              placeholder="Por ejemplo: brisa"
              onChange={(event) => {
                setWord(event.target.value);
                clearResult();
              }}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Consultando…" : "Consultar mi voto"}
            <Search size={23} />
          </button>
        </form>
        {error && (
          <p className="error" role="alert" ref={errorRef} tabIndex={-1}>
            {error}
          </p>
        )}
        {found !== null && (
          <div
            className="public-receipt-result"
            role="status"
            ref={resultRef}
            tabIndex={-1}
          >
            {found ? (
              <>
                <h3>
                  <CheckCircle2 size={25} /> Tu voto está registrado
                </h3>
                <p>
                  El nombre y la palabra clave coinciden con un voto registrado.
                  No necesitas votar nuevamente.
                </p>
              </>
            ) : (
              <p>
                No se encontró un voto con ese nombre y esa palabra clave.
                Revisa que el nombre esté escrito como al votar y que la palabra
                coincida con la de tu comprobante.
              </p>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
