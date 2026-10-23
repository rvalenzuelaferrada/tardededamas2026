"use client";
import { useState } from "react";
import {
  ArrowLeft,
  Download,
  LockKeyhole,
  Search,
  CheckCircle2,
} from "lucide-react";
type Results = {
  voters: { name: string }[];
  total: number;
  demo: boolean;
  open: boolean;
  results: { id: number; name: string; votes: number }[];
};
type ReceiptResult =
  | { found: false }
  | { found: true; name: string; gifts: { id: number; name: string }[] };
export default function Admin() {
  const [key, setKey] = useState(""),
    [data, setData] = useState<Results | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [voterSearch, setVoterSearch] = useState("");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptWord, setReceiptWord] = useState("");
  const [receiptResult, setReceiptResult] = useState<ReceiptResult | null>(
    null,
  );
  const [receiptError, setReceiptError] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);
  async function consultReceipt(event: React.FormEvent) {
    event.preventDefault();
    setReceiptResult(null);
    setReceiptError("");
    setReceiptBusy(true);
    try {
      const response = await fetch("/api/admin/receipt", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ word: receiptWord }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No se pudo consultar el comprobante.");
      setReceiptResult(result);
    } catch (error) {
      setReceiptError(
        error instanceof Error
          ? error.message
          : "Error de conexión. Intenta nuevamente.",
      );
    } finally {
      setReceiptBusy(false);
    }
  }
  const normalizeSearch = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("es")
      .trim();
  const searchTerms = normalizeSearch(voterSearch).split(/\s+/).filter(Boolean);
  const visibleVoters =
    data?.voters.filter((voter) =>
      searchTerms.every((term) => normalizeSearch(voter.name).includes(term)),
    ) ?? [];
  async function load(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/results", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (e) {
      setData(null);
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el resultado.",
      );
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!data) return;
    const text =
      "\uFEFFOpción;Regalo;Votos\r\n" +
      data.results
        .map((r) => `${r.id};"${r.name.replaceAll('"', '""')}";${r.votes}`)
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "resultados-tarde-de-damas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="admin-shell">
      <a href="/" className="pdf-link">
        <ArrowLeft size={16} /> Volver a la votación
      </a>
      <h1>Panel de organización</h1>
      <p>
        Los resultados son privados. Ingresa la clave configurada por la
        organización.
      </p>
      <form className="admin-form" onSubmit={load}>
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Clave de organización"
          aria-label="Clave de organización"
          required
          disabled={receiptBusy || busy}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setData(null);
            setReceiptResult(null);
            setReceiptError("");
            setReceiptWord("");
            setReceiptOpen(false);
          }}
        />
        <button className="primary" disabled={busy || receiptBusy}>
          <LockKeyhole size={16} />
          {busy
            ? "Consultando…"
            : data
              ? "Actualizar resultados"
              : "Consultar resultados"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="admin-summary">
            <span>
              <b>{data.total}</b> socios han votado
            </span>
            <span>{data.open ? "Votación abierta" : "Votación cerrada"}</span>
            <span>{data.demo ? "Demostración" : "Votos reales"}</span>
          </div>
          <section className="admin-receipt" aria-labelledby="receipt-heading">
            <button
              className="primary"
              id="receipt-heading"
              aria-expanded={receiptOpen}
              aria-controls="receipt-lookup"
              onClick={() => {
                setReceiptOpen(!receiptOpen);
                setReceiptResult(null);
                setReceiptError("");
              }}
              disabled={receiptBusy}
            >
              <Search size={22} />{" "}
              {receiptOpen
                ? "Cerrar consulta de comprobante"
                : "Consultar palabra de comprobante"}
            </button>
            {receiptOpen && (
              <div id="receipt-lookup">
                <p>
                  Ingresa la palabra que recibió el socio al votar. Solo al
                  consultarla se mostrarán su nombre y los regalos registrados.
                </p>
                <form className="receipt-lookup-form" onSubmit={consultReceipt}>
                  <label>
                    Palabra de comprobante
                    <input
                      type="text"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      maxLength={100}
                      required
                      value={receiptWord}
                      disabled={receiptBusy}
                      placeholder="Por ejemplo: brisa"
                      onChange={(event) => {
                        setReceiptWord(event.target.value);
                        setReceiptResult(null);
                        setReceiptError("");
                      }}
                    />
                  </label>
                  <button
                    className="primary"
                    disabled={receiptBusy || busy || !receiptWord.trim()}
                  >
                    {receiptBusy ? "Consultando…" : "Consultar comprobante"}
                    <Search size={21} />
                  </button>
                </form>
                {receiptError && (
                  <p className="error" role="alert">
                    {receiptError}
                  </p>
                )}
                {receiptResult && (
                  <div className="receipt-lookup-result" role="status">
                    {receiptResult.found ? (
                      <>
                        <h3>
                          <CheckCircle2 size={24} /> Voto registrado
                        </h3>
                        <p>
                          <strong>Socio:</strong> {receiptResult.name}
                        </p>
                        <p>
                          <strong>Regalos elegidos:</strong>
                        </p>
                        <ul>
                          {receiptResult.gifts.map((gift) => (
                            <li key={gift.id}>{gift.name}</li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <p>
                        No se encontró un voto con esa palabra. Revisa que
                        coincida con la del comprobante.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
          <p>
            Cada opción elegida suma un voto. El porcentaje indica cuántos
            participantes eligieron ese regalo; la suma puede superar el 100 %.
            Los empates deben ser resueltos por la organización.
          </p>
          <div className="admin-results">
            {data.results.map((r) => (
              <article className="result" key={r.id}>
                <div>
                  <b>{r.name}</b>
                  <span>
                    {r.votes} votos ·{" "}
                    {data.total ? Math.round((r.votes / data.total) * 100) : 0}%
                  </span>
                </div>
                <div className="result-bar">
                  <span
                    style={{
                      width: `${data.total ? (r.votes / data.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
          <button
            className="primary"
            style={{ marginTop: 24 }}
            onClick={download}
          >
            <Download size={16} /> Descargar resultados CSV
          </button>
          <section className="admin-voters" aria-labelledby="voters-title">
            <h2 id="voters-title">
              Socios que ya votaron ({data.voters.length})
            </h2>
            <p>
              Listado en orden alfabético. No muestra los regalos elegidos por
              cada socio.
            </p>
            {data.voters.length > 0 ? (
              <>
                <label className="voter-search">
                  Buscar socio
                  <input
                    type="search"
                    autoComplete="off"
                    placeholder="Escribe un nombre o apellido"
                    value={voterSearch}
                    onChange={(event) => setVoterSearch(event.target.value)}
                  />
                </label>
                <p className="voter-match-count" role="status">
                  {visibleVoters.length} de {data.voters.length} socios
                </p>
                {visibleVoters.length ? (
                  <ul className="voters-list">
                    {visibleVoters.map((voter) => (
                      <li key={voter.name}>{voter.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No se encontraron socios con ese nombre.</p>
                )}
              </>
            ) : (
              <p>Todavía no hay votos registrados.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
