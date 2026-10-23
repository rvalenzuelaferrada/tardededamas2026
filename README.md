# Tarde de Damas 2026

Aplicación Next.js (App Router), React y TypeScript para elegir el regalo de la Tarde de Damas. Incluye las siete propuestas del PDF original, fotografías extraídas del documento, detalle de condiciones y costos, selección de uno o dos regalos, confirmación, comprobante y panel privado de resultados.

## Iniciar

Requiere Node.js 22.13 o superior (SQLite integrado de Node).

```sh
npm install
cp .env.example .env.local
# Configurar ADMIN_TOKEN con una clave segura (openssl rand -hex 32).
npm run dev
```

Abrir http://localhost:3000. Panel de organización: http://localhost:3000/admin. La clave se ingresa en el panel y se envía como Bearer; nunca se publica en el frontend ni se guarda en localStorage. El panel privado incluye una lista alfabética de los socios que ya votaron, con búsqueda por nombre o apellido, sin asociar sus nombres a los regalos elegidos.

## Experiencia de votación

Flujo guiado en tres pantallas: regalos, nombre y confirmación. Sin portada ni filtros. En teléfonos las fichas aparecen en una columna, con texto grande y botones de al menos 56 px. Los controles para continuar o volver permanecen en la parte inferior. Se puede volver para corregir los datos sin perder las elecciones. Los detalles y las páginas originales de cada propuesta se consultan aparte. Al enviar se muestra una pantalla final con el comprobante.

## Reglas de votación

- El participante escribe nombre(s) y apellidos, confirma que es esa persona y revisa antes de enviar.
- No se requiere nómina. Solo se solicitan nombres, no RUT, correo ni contraseña.
- Se aceptan uno o dos regalos distintos. Cada regalo seleccionado recibe un voto, sin prioridad.
- La identidad se obtiene del nombre completo normalizado: sin tildes, sin diferencias de mayúsculas, con espacios y puntuación uniformes.
- Una restricción UNIQUE de SQLite y una transacción bloquean una segunda papeleta con la misma identidad, incluso desde otro dispositivo o en solicitudes simultáneas.
- Este es un sistema basado en confianza: no verifica identidad real ni pertenencia al club. Nombres escritos de otra manera pueden permitir otro voto y dos homónimos comparten identidad. Para reclamos, la organización debe revisar el caso y la base de datos. No hay eliminación pública ni edición de votos.
- Los empates se presentan como tales; no se inventa un desempate.

## Configuración

- `DEMO_MODE=false`: votación real (valor por defecto). `true`: votos de prueba separados; se muestra una franja de demostración.
- `VOTING_OPEN=true`: acepta votos. `false`: permite consultar regalos pero bloquea votos, también en el servidor. Reiniciar el proceso al cambiar configuración.
- `ADMIN_TOKEN`: clave privada del panel. Si está vacía, el endpoint de resultados queda deshabilitado.
- `DATABASE_PATH`: ruta de SQLite; por defecto `./data/votacion.sqlite`. No subir base ni archivos WAL/SHM al repositorio.

## Producción

```sh
npm run test
npm run build
npm start
```

Desplegar en un servidor Node con disco persistente (una instancia y volumen para `data/`). No utilizar esta configuración SQLite en funciones efímeras como Vercel ni varias instancias con discos separados: se perderían votos o se permitirían duplicados. Para esos entornos migrar a PostgreSQL compartido, conservando la restricción única de identidad y la transacción.

Usar HTTPS y mantener copias de seguridad de la base. Para obtener una copia consistente con el servidor activo, usar SQLite Backup API o `VACUUM INTO`, no copiar solo el archivo principal cuando WAL está activo. La base contiene nombres y elecciones: limitar acceso a la organización. Guardar la clave fuera del repositorio y no compartirla con votantes.

El panel permite consultar resultados y exportar CSV. El estado abierto/cerrado se controla en el servidor por variable de entorno. Los porcentajes usan participantes como denominador; pueden sumar hasta 200 %.

## Contenido y diseño

Los precios son los costos adicionales indicados en el PDF, en pesos chilenos: opciones 1–4 sin costo adicional, opción 5 $2.000, opción 6 $4.000 y opción 7 $5.000. Los aros incluyen una posible versión de plata con costo adicional no especificado. Las imágenes originales y el PDF están en `public/`; cada ficha permite abrir sus páginas completas. La disponibilidad de colores no se da por confirmada.

La tipografía se carga desde Google Fonts con alternativas de sistema si no hay conexión. No se usan servicios externos para guardar votos. `npm test` comprueba las reglas y la unicidad con bases temporales independientes de la votación real.

## Palabras de comprobante

Cada voto nuevo recibe una palabra aleatoria de una lista de 200 palabras distintas, en `lib/receipt-words.ts`. La relación con la papeleta se guarda en `receipts`. Se reserva dentro de la misma transacción que el voto; la restricción `UNIQUE(demo, word)` impide repetir palabras, incluso con solicitudes simultáneas. No se reutilizan tras reiniciar el servidor. Al agotar las 200, se rechazan votos nuevos sin guardar papeletas parciales. Los votos de demostración tienen su propio registro, con la misma lista, y no consumen palabras reales. Los comprobantes anteriores conservan sus identificadores originales y siguen siendo válidos.

## Consulta privada de comprobantes

En `/admin`, el botón «Consultar palabra de comprobante» permite ingresar la palabra del socio y consultar su nombre y regalos registrados. Requiere la clave de organización y una palabra válida. La lista general de socios no incluye palabras ni elecciones. La consulta usa POST (no se pone la palabra en la URL) y no se guarda en caché. Una palabra no encontrada no demuestra que una persona no haya votado; podría estar mal escrita o corresponder a otro comprobante.

## Consulta pública del propio voto

La página principal incluye «Consultar mi voto». Pide nombre y apellido tal como se ingresaron al votar y la palabra clave del comprobante. Ambos deben coincidir con una misma papeleta. El endpoint público devuelve únicamente `found: true/false`, sin nombres almacenados, palabras ni regalos elegidos. Ignora mayúsculas, tildes y espacios repetidos. Usa POST y `Cache-Control: no-store`. La consulta con detalle de regalos continúa protegida por la clave de organización y requiere la palabra de comprobante.

## Dominio público y proxy inverso

Si aparece «Solicitud no permitida» en producción, configurar `APP_ORIGIN` con el origen público exacto, por ejemplo `https://votacion.clubdeoratoria.cl`, y reiniciar o redesplegar. El navegador usa HTTPS y el dominio público, mientras el proceso Node puede recibir una URL interna HTTP. La validación compara contra `APP_ORIGIN` cuando está configurada. Sin esa variable, reconoce `X-Forwarded-Host`/`X-Forwarded-Proto` o `Host`; el proxy del hosting debe establecer y sobrescribir estas cabeceras. No se desactiva la validación de solicitudes desde otros sitios.
