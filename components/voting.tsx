"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Flower2,
  Info,
  X,
} from "lucide-react";
import { gifts, money, type Gift } from "@/lib/gifts";
import ReceiptLookup from "@/components/receipt-lookup";

export default function Voting({
  demo,
  open,
}: {
  demo: boolean;
  open: boolean;
}) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [detail, setDetail] = useState<Gift | null>(null);
  const [expandedImage, setExpandedImage] = useState<{
    page: number;
    pages: number[];
    name: string;
  } | null>(null);
  const [imageZoomed, setImageZoomed] = useState(false);
  const imageDialogRef = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const chosen = gifts.filter((g) => selected.includes(g.id));
  const galleryIndex = expandedImage
    ? expandedImage.pages.indexOf(expandedImage.page)
    : 0;
  function moveImage(direction: number) {
    if (!expandedImage) return;
    const next = galleryIndex + direction;
    if (next < 0 || next >= expandedImage.pages.length) return;
    setImageZoomed(false);
    setExpandedImage({ ...expandedImage, page: expandedImage.pages[next] });
  }

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    titleRef.current?.focus({ preventScroll: true });
  }, [step, receipt]);
  useEffect(() => {
    if (detail) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [detail]);

  useEffect(() => {
    if (expandedImage) imageDialogRef.current?.showModal();
    else imageDialogRef.current?.close();
  }, [expandedImage]);

  useEffect(() => {
    if (error && !busy && errorRef.current) {
      errorRef.current.scrollIntoView({ block: "center", behavior: "instant" });
      errorRef.current.focus({ preventScroll: true });
    }
  }, [error, busy]);

  function changeStep(next: number) {
    setError("");
    setNotice("");
    setStep(next);
  }
  function toggle(id: number) {
    setNotice("");
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else if (selected.length < 2) setSelected([...selected, id]);
    else
      setNotice(
        "Ya elegiste dos regalos. Para cambiar uno, toca «Quitar» en el regalo que no quieres.",
      );
  }
  function next() {
    if (step === 0 && selected.length) changeStep(1);
    else if (step === 1) formRef.current?.requestSubmit();
  }
  async function vote() {
    if (busy) return;
    if (!selected.length) {
      setError("Elige al menos un regalo antes de confirmar.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          giftIds: selected,
          confirmed,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "No pudimos registrar tu voto.");
      setReceipt(result.receipt);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No hay conexión. Intenta nuevamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="voting-app">
      <header className="voting-header">
        <span className="voting-brand">
          <Flower2 aria-hidden="true" size={27} />
          <span>
            Tarde de Damas <b>2026</b>
          </span>
        </span>
        <ReceiptLookup />
      </header>
      {demo && (
        <p className="demo-banner">Demostración: estos votos son de prueba.</p>
      )}
      {!open && (
        <p className="closed-banner" role="status">
          La votación está cerrada. Puedes revisar los regalos.
        </p>
      )}
      {!receipt && (
        <nav className="progress" aria-label="Progreso de la votación">
          <div className="progress-label">
            <span>Paso {step + 1} de 3</span>
            <span>
              {
                ["Elige tus regalos", "Escribe tu nombre", "Confirma tu voto"][
                  step
                ]
              }
            </span>
          </div>
          <ol>
            {["Regalos", "Tu nombre", "Confirmación"].map((label, i) => (
              <li
                key={label}
                aria-current={i === step ? "step" : undefined}
                className={i <= step ? "complete" : ""}
              >
                <span className="progress-line" />
                <span className="progress-name">
                  {i < step ? <Check size={15} /> : i + 1} {label}
                </span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <main className={`voting-main ${step === 0 && !receipt ? "wide" : ""}`}>
        {receipt ? (
          <section className="done-screen">
            <CheckCircle2 className="done-icon" size={64} />
            <h1 ref={titleRef} tabIndex={-1}>
              ¡Tu voto fue recibido!
            </h1>
            <p>
              Gracias, {firstName}. Ya terminaste y puedes cerrar esta página.
            </p>
            <div className="receipt-card">
              <p className="receipt-name">
                <strong>
                  {`${firstName} ${lastName}`.trim().replace(/\s+/g, " ")}
                </strong>
                , tu palabra clave es:
              </p>
              <code className="receipt receipt-word">{receipt}</code>
              <p className="helper">
                Toma una captura de este comprobante. Para consultar tu voto
                necesitarás este nombre y apellido y esta palabra clave.
              </p>
            </div>
            <div className="summary-list">
              {chosen.map((g) => (
                <div className="summary-item" key={g.id}>
                  <img src={`/regalos/regalo-${g.id}.png`} alt="" />
                  <div>
                    <h2>{g.name}</h2>
                    <p>
                      {g.cost
                        ? `${money(g.cost)} adicional`
                        : "Sin costo adicional"}
                    </p>
                  </div>
                  <CheckCircle2 size={24} />
                </div>
              ))}
            </div>
            <p className="helper">
              Si hay algún error, contacta a la organización e indica este
              comprobante.
            </p>
          </section>
        ) : (
          <>
            <div className="screen-heading">
              <h1 ref={titleRef} tabIndex={-1}>
                {
                  [
                    "¿Qué regalos prefieres?",
                    "¿Cómo te llamas?",
                    "Revisa antes de enviar",
                  ][step]
                }
              </h1>
              <p>
                {
                  [
                    "Puedes elegir solo un regalo o un máximo de dos.",
                    "Escribe tu nombre y apellido.",
                    "Comprueba tu nombre y los regalos que elegiste.",
                  ][step]
                }
              </p>
            </div>
            {step === 0 && (
              <>
                <div className="selection-explainer">
                  <Info size={22} />
                  <span>
                    Elige solo uno si tienes un favorito, o marca dos si
                    quedarías conforme con cualquiera de los dos.
                  </span>
                </div>
                <div className="gift-grid">
                  {gifts.map((g) => {
                    const picked = selected.includes(g.id);
                    return (
                      <article
                        key={g.id}
                        className={`gift-card ${picked ? "chosen" : ""}`}
                      >
                        <div className={`gift-photo photo-${g.id}`}>
                          <img
                            src={`/regalos/regalo-${g.id}.png`}
                            alt={g.name}
                          />
                          <span className="option-number">Opción {g.id}</span>
                          {picked && (
                            <span
                              className="picked-mark"
                              aria-label="Seleccionado"
                            >
                              <Check size={22} />
                            </span>
                          )}
                        </div>
                        <div className="gift-content">
                          <h2>{g.name}</h2>
                          <p className={`gift-cost ${g.cost ? "extra" : ""}`}>
                            {g.cost
                              ? `+ ${money(g.cost)} adicional`
                              : "Sin costo adicional"}
                          </p>
                          <p className="gift-description">{g.description}</p>
                          <button
                            className="detail-link"
                            onClick={() => setDetail(g)}
                            aria-label={`Ver detalles de ${g.name}`}
                          >
                            Ver detalles
                          </button>
                          <button
                            className={`choice-button ${picked ? "picked" : ""}`}
                            aria-label={`${picked ? "Quitar" : "Elegir"} ${g.name}`}
                            aria-pressed={picked}
                            disabled={!open}
                            onClick={() => toggle(g.id)}
                          >
                            {picked ? (
                              <>
                                <Check size={22} /> Elegido · Quitar
                              </>
                            ) : (
                              "Elegir este regalo"
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
                <p className="helper">
                  Costos adicionales en pesos chilenos. Las imágenes y
                  condiciones corresponden a las propuestas originales.
                </p>
              </>
            )}
            {step === 1 && (
              <form
                id="identity-form"
                ref={formRef}
                className="identity-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  changeStep(2);
                }}
              >
                <label>
                  Nombre
                  <input
                    autoComplete="given-name"
                    enterKeyHint="next"
                    required
                    minLength={2}
                    maxLength={100}
                    pattern="[\p{L}\p{M} '\-’]+"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Por ejemplo: Juan"
                  />
                </label>
                <label>
                  Apellido
                  <input
                    autoComplete="family-name"
                    enterKeyHint="done"
                    required
                    minLength={2}
                    maxLength={100}
                    pattern="[\p{L}\p{M} '\-’]+"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Por ejemplo: Pérez"
                  />
                </label>
                <label className="identity-consent">
                  <input
                    type="checkbox"
                    required
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                  />
                  <span>
                    Soy esta persona, mi nombre está bien escrito y no he votado
                    antes.
                  </span>
                </label>
              </form>
            )}
            {step === 2 && (
              <section className="review-screen">
                {error && (
                  <div
                    className="error vote-error"
                    role="alert"
                    ref={errorRef}
                    tabIndex={-1}
                  >
                    <strong>No se pudo registrar tu voto</strong>
                    <p>{error}</p>
                  </div>
                )}
                <div className="review-name">
                  <span>Tu nombre y apellido</span>
                  <h2>
                    {firstName} {lastName}
                  </h2>
                  <button
                    className="detail-link"
                    disabled={busy}
                    onClick={() => changeStep(1)}
                  >
                    Corregir mi nombre
                  </button>
                </div>
                <div className="review-section-title">
                  <h2>
                    {chosen.length === 1
                      ? "Tu regalo elegido"
                      : "Tus regalos elegidos"}
                  </h2>
                  <button
                    className="detail-link"
                    disabled={busy}
                    onClick={() => changeStep(0)}
                  >
                    Cambiar regalos
                  </button>
                </div>
                {chosen.length === 2 && (
                  <p className="identity-note review-choice-note">
                    <Info size={23} />
                    <span>
                      Ambos regalos recibirán un voto por igual. Marca dos solo
                      si quedarías conforme con cualquiera de los dos. Si tienes
                      un favorito, puedes quitar el otro.
                    </span>
                  </p>
                )}
                <div className="summary-list">
                  {chosen.map((g) => (
                    <div className="summary-item" key={g.id}>
                      <img src={`/regalos/regalo-${g.id}.png`} alt="" />
                      <div>
                        <h3>{g.name}</h3>
                        <p>
                          {g.cost
                            ? `${money(g.cost)} adicional`
                            : "Sin costo adicional"}
                        </p>
                      </div>
                      <button
                        className="remove-choice"
                        disabled={busy}
                        aria-label={`Quitar ${g.name} de mi voto`}
                        onClick={() => {
                          toggle(g.id);
                          setError("");
                        }}
                      >
                        <X size={20} /> Quitar
                      </button>
                    </div>
                  ))}
                </div>
                {chosen.length === 0 && (
                  <div className="empty-choices" role="status">
                    <p>
                      Quitaste todos los regalos. Elige al menos uno para poder
                      confirmar tu voto.
                    </p>
                    <button className="primary" onClick={() => changeStep(0)}>
                      Elegir regalos <ArrowRight size={23} />
                    </button>
                  </div>
                )}
                <p className="identity-note">
                  <Info size={23} />
                  <span>
                    Al confirmar, tu voto quedará registrado. No podrás votar
                    nuevamente
                  </span>
                </p>
              </section>
            )}
          </>
        )}
      </main>
      {notice && (
        <aside className="selection-notice" role="alert">
          <Info size={24} />
          <p>{notice}</p>
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
            <X size={24} />
          </button>
        </aside>
      )}
      {!receipt && (
        <div className="step-controls">
          <div className="controls-inner">
            {step === 0 ? (
              <p className="selection-status" aria-live="polite">
                <strong>{selected.length} de 2</strong>
                <span> regalos elegidos</span>
              </p>
            ) : (
              <button
                className="previous-button"
                disabled={busy}
                onClick={() => changeStep(step - 1)}
              >
                <ArrowLeft size={21} /> Atrás
              </button>
            )}
            <button
              className="primary next-button"
              disabled={!open || busy || !selected.length}
              onClick={step === 2 ? vote : next}
            >
              {busy
                ? "Enviando tu voto…"
                : step === 2
                  ? demo
                    ? "Confirmar voto de prueba"
                    : "Confirmar mi voto"
                  : "Continuar"}
              {step === 2 ? <Check size={23} /> : <ArrowRight size={23} />}
            </button>
          </div>
        </div>
      )}
      <footer className="voting-footer">
        <a href="/admin">Acceso de organización</a>
      </footer>
      <dialog
        ref={dialogRef}
        className="detail-modal"
        aria-labelledby="detail-title"
        onCancel={() => setDetail(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDetail(null);
        }}
      >
        {detail && (
          <>
            <div className="modal-header">
              <span>Opción {detail.id} de 7</span>
              <button className="close-modal" onClick={() => setDetail(null)}>
                <X size={22} /> Cerrar
              </button>
            </div>
            <h2 id="detail-title">{detail.name}</h2>
            <p className={`gift-cost ${detail.cost ? "extra" : ""}`}>
              {detail.cost
                ? `+ ${money(detail.cost)} adicional`
                : "Sin costo adicional"}
            </p>
            <ul>
              {detail.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <details className="original-proposal" open>
              <summary>Ver imágenes de la propuesta original</summary>
              {detail.pages.map((p) => (
                <button
                  key={p}
                  className="proposal-image-button"
                  onClick={() => {
                    setImageZoomed(false);
                    setExpandedImage({
                      page: p,
                      pages: detail.pages,
                      name: detail.name,
                    });
                  }}
                  aria-label={`Abrir imagen completa: página ${p} de ${detail.name}`}
                >
                  <img
                    src={`/regalos/pagina-${p}.png`}
                    alt={`Página ${p} de la propuesta de ${detail.name}`}
                  />
                  <span>Abrir imagen completa</span>
                </button>
              ))}
            </details>
            <button
              className="primary"
              disabled={!open}
              onClick={() => {
                toggle(detail.id);
                setDetail(null);
              }}
            >
              {selected.includes(detail.id)
                ? "Quitar este regalo"
                : "Elegir este regalo"}
              <Check size={23} />
            </button>
          </>
        )}
      </dialog>
      <dialog
        ref={imageDialogRef}
        className="image-viewer"
        aria-labelledby="image-viewer-title"
        onCancel={() => setExpandedImage(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            moveImage(event.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        {expandedImage && (
          <>
            <header className="image-viewer-header">
              <h2 id="image-viewer-title">{expandedImage.name}</h2>
              <button
                className="close-modal"
                onClick={() => setExpandedImage(null)}
              >
                <X size={24} /> Cerrar
              </button>
            </header>
            <div className="image-viewer-toolbar">
              <span aria-live="polite" aria-atomic="true">
                Imagen {galleryIndex + 1} de {expandedImage.pages.length} de
                esta propuesta
              </span>
              <button
                className="image-zoom-button"
                aria-pressed={imageZoomed}
                onClick={() => setImageZoomed(!imageZoomed)}
              >
                {imageZoomed ? "Ajustar a pantalla" : "Ampliar imagen"}
              </button>
            </div>
            <div
              className={`image-viewer-canvas ${imageZoomed ? "zoomed" : ""}`}
              key={`${expandedImage.page}-${imageZoomed}`}
            >
              <img
                src={`/regalos/pagina-${expandedImage.page}.png`}
                alt={`Página ${expandedImage.page} de la propuesta de ${expandedImage.name}`}
              />
            </div>
            {expandedImage.pages.length > 1 && (
              <nav
                className="gallery-controls"
                aria-label="Imágenes de esta propuesta"
              >
                <button
                  className="gallery-button"
                  disabled={galleryIndex === 0}
                  onClick={() => moveImage(-1)}
                >
                  <ArrowLeft size={23} /> Anterior
                </button>
                <span className="gallery-position" aria-hidden="true">
                  {galleryIndex + 1} / {expandedImage.pages.length}
                </span>
                <button
                  className="gallery-button"
                  disabled={galleryIndex === expandedImage.pages.length - 1}
                  onClick={() => moveImage(1)}
                >
                  Siguiente <ArrowRight size={23} />
                </button>
              </nav>
            )}
          </>
        )}
      </dialog>
    </div>
  );
}
