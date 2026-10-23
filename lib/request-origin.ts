/** Valida el origen público, incluyendo despliegues detrás de un proxy inverso. */
export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  // Clientes que no son navegadores pueden no enviar Origin.
  if (!origin) return true;
  let received: URL;
  try {
    received = new URL(origin);
    if (
      !["http:", "https:"].includes(received.protocol) ||
      received.origin !== origin
    )
      return false;
  } catch {
    return false;
  }

  // En producción se recomienda fijar el dominio público explícitamente.
  if (process.env.APP_ORIGIN) {
    try {
      const configured = new URL(process.env.APP_ORIGIN);
      return (
        ["http:", "https:"].includes(configured.protocol) &&
        received.origin === configured.origin
      );
    } catch {
      return false;
    }
  }

  const internal = new URL(request.url);
  const host = (
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  )
    ?.split(",")[0]
    .trim();
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    internal.protocol.slice(0, -1);
  if (host) {
    if (!["http", "https"].includes(protocol) || /[\s/@\\?#]/.test(host))
      return false;
    try {
      return received.origin === new URL(`${protocol}://${host}`).origin;
    } catch {
      return false;
    }
  }
  return received.origin === internal.origin;
}
