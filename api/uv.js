const ALLOWED_ORIGIN = "https://crutson.github.io";

// Estación "La Florida, La Serena Ad." — la más cercana a la instalación
// KCC (Coquimbo/La Serena) en la red de radiómetros UV de la DMC.
const STATION_CODE = 290004;

function todayInSantiago() {
  const parts = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(new Date());
  const d = {};
  parts.forEach((p) => { d[p.type] = p.value; });
  return `${d.day}-${d.month}-${d.year}`;
}

// Fuente oficial: Dirección Meteorológica de Chile. Requiere credenciales
// personales (usuario/token) configuradas como variables de entorno en
// Vercel — nunca en el repo. El endpoint devuelve TODAS las estaciones de
// la red UV; acá se filtra la de La Serena y se calcula el máximo del día
// (más útil para un guardia que la lectura del instante exacto, que de
// noche siempre es 0).
async function getUvFromDMC() {
  const usuario = process.env.DMC_USUARIO;
  const token = process.env.DMC_TOKEN;
  const url = `https://climatologia.meteochile.gob.cl/application/servicios/getRecienteUvb/${STATION_CODE}?usuario=${encodeURIComponent(usuario)}&token=${token}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`DMC respondió ${r.status}`);
  const data = await r.json();

  const st = (data.datosRecientes || []).find((s) => s.estacion.codigoNacional === STATION_CODE);
  if (!st) throw new Error(`Estación ${STATION_CODE} no encontrada en la respuesta de la DMC`);

  const today = todayInSantiago();
  const todayReadings = st.indiceUV.filter((x) => x.fecha === today);
  const readings = todayReadings.length ? todayReadings : st.indiceUV.slice(-1);
  const max = readings.reduce((m, x) => Math.max(m, parseFloat(x.indiceUV) || 0), 0);

  return {
    uvIndex: Math.round(max * 10) / 10,
    date: today,
    station: st.estacion.nombreEstacion,
    source: "Dirección Meteorológica de Chile",
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // Se cachea 1 hora: el UV no cambia tan rápido y evita pegarle a la API
  // de la DMC en cada carga de la app.
  res.setHeader("Cache-Control", "public, max-age=3600");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({error: "method not allowed"});

  try {
    const data = await getUvFromDMC();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};
