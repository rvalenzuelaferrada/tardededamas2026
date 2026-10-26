"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Download,
  LockKeyhole,
  Search,
  CheckCircle2,
  Trash2,
  X,
} from "lucide-react";
import { gifts, money } from "@/lib/gifts";
type VotePreview = {
  id: string;
  name: string;
  gifts: { id: number; name: string }[];
};
type Results = {
  voters: { id: string; name: string }[];
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
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [votePreview, setVotePreview] = useState<VotePreview | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (votePreview) deleteDialogRef.current?.showModal();
    else deleteDialogRef.current?.close();
  }, [votePreview]);
  async function removeVote(voter: Results["voters"][number]) {
    if (deleting) return;
    setDeleting(voter.id);
    setError("");
    setDeleteMessage("");
    try {
      const headers = {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      };
      const preview = await fetch(
        `/api/admin/votes?ballotId=${encodeURIComponent(voter.id)}`,
        { headers, cache: "no-store" },
      );
      const vote = await preview.json();
      if (!preview.ok) throw new Error(vote.error);
      setDeleteError("");
      setVotePreview(vote);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo consultar el voto. Intenta nuevamente.",
      );
    } finally {
      setDeleting(null);
    }
  }
  async function confirmDelete() {
    if (!votePreview || deleting) return;
    const vote = votePreview;
    setDeleting(vote.id);
    setDeleteError("");
    try {
      const headers = {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      };
      const response = await fetch("/api/admin/votes", {
        method: "DELETE",
        headers,
        body: JSON.stringify({ ballotId: vote.id, confirmed: true }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setVotePreview(null);
      setReceiptResult(null);
      setDeleteMessage(`Se eliminó el voto de ${vote.name}.`);
      setData(null);
      const refreshed = await fetch("/api/admin/results", {
        headers,
        cache: "no-store",
      }).catch(() => null);
      if (!refreshed) {
        setError(
          "El voto se eliminó, pero no se pudieron actualizar los resultados. Vuelve a consultarlos.",
        );
        return;
      }
      const results = await refreshed.json();
      if (!refreshed.ok) {
        setError(
          "El voto se eliminó, pero no se pudieron actualizar los resultados. Vuelve a consultarlos.",
        );
        return;
      }
      setData(results);
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el voto. Intenta nuevamente.",
      );
    } finally {
      setDeleting(null);
    }
  }
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
          disabled={receiptBusy || busy || !!deleting}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setDeleteMessage("");
            setData(null);
            setReceiptResult(null);
            setReceiptError("");
            setReceiptWord("");
            setReceiptOpen(false);
          }}
        />
        <button
          className="primary"
          disabled={busy || receiptBusy || !!deleting}
        >
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
      {deleteMessage && <p role="status">{deleteMessage}</p>}
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
              disabled={receiptBusy || !!deleting}
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
                      disabled={receiptBusy || !!deleting}
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
                    disabled={
                      receiptBusy || busy || !!deleting || !receiptWord.trim()
                    }
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
              cada socio. Al eliminar un voto, verás sus elecciones y deberás
              confirmar.
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
                      <li key={voter.id} className="voter-row">
                        <span>{voter.name}</span>
                        <button
                          type="button"
                          className="delete-vote delete-vote-icon"
                          disabled={!!deleting || busy || receiptBusy}
                          onClick={() => removeVote(voter)}
                          aria-label={`Eliminar voto de ${voter.name}`}
                          title={
                            deleting === voter.id
                              ? "Consultando…"
                              : `Eliminar voto de ${voter.name}`
                          }
                          aria-busy={deleting === voter.id}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      </li>
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
      <dialog
        ref={deleteDialogRef}
        className="detail-modal delete-vote-modal"
        aria-labelledby="delete-vote-title"
        aria-describedby="delete-vote-description"
        onCancel={(event) => {
          if (deleting) event.preventDefault();
          else setVotePreview(null);
        }}
        onClose={() => setVotePreview(null)}
      >
        {votePreview && (
          <>
            <div className="modal-header">
              <span>Revisar voto del socio</span>
              <button
                type="button"
                className="close-modal"
                disabled={!!deleting}
                onClick={() => setVotePreview(null)}
                autoFocus
              >
                <X size={20} /> Cancelar
              </button>
            </div>
            <h2 id="delete-vote-title">
              ¿Eliminar el voto de {votePreview.name}?
            </h2>
            <p id="delete-vote-description">
              Se borrará lo que este socio eligió: {votePreview.gifts.length}{" "}
              {votePreview.gifts.length === 1
                ? "regalo registrado."
                : "regalos registrados."}
            </p>
            <div className="delete-vote-gifts">
              {votePreview.gifts.map((selected) => {
                const gift = gifts.find((gift) => gift.id === selected.id);
                return (
                  <article key={selected.id} className="delete-vote-gift">
                    <img
                      src={`/regalos/regalo-${selected.id}.png`}
                      alt={`Previsualización de ${selected.name}`}
                    />
                    <div>
                      <span className="delete-vote-option">
                        Opción {selected.id}
                      </span>
                      <h3>{selected.name}</h3>
                      {gift && (
                        <>
                          <p>{gift.description}</p>
                          <p className="delete-vote-cost">
                            {gift.cost
                              ? `+ ${money(gift.cost)} adicional`
                              : "Sin costo adicional"}
                          </p>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="delete-vote-warning">
              <strong>Esta acción no se puede deshacer.</strong>
              <p>
                También se borrará su comprobante y se descontarán sus
                elecciones de los resultados. El socio podrá volver a votar si
                la votación está abierta.
              </p>
            </div>
            {deleteError && (
              <p className="error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="delete-vote-actions">
              <button
                type="button"
                className="close-modal"
                disabled={!!deleting}
                onClick={() => setVotePreview(null)}
              >
                Conservar voto
              </button>
              <button
                type="button"
                className="delete-vote delete-vote-confirm"
                disabled={!!deleting}
                onClick={confirmDelete}
              >
                <Trash2 size={18} />{" "}
                {deleting ? "Eliminando…" : "Sí, eliminar voto"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </main>
  );
}
