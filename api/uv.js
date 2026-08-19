const ALLOWED_ORIGIN = "https://crutson.github.io";

// Estación "La Florida, La Serena Ad." — la más cercana a la instalación
// KCC (Coquimbo/La Serena) en la red de radiómetros UV de la DMC.
const STATION_CODE = 290004;

// Fuente oficial: Dirección Meteorológica de Chile. Requiere credenciales
// personales (usuario/token) configuradas como variables de entorno en
// Vercel — nunca en el repo. El endpoint devuelve TODAS las estaciones de
// la red UV; acá se filtra la de La Serena y se toma la lectura MÁS
// RECIENTE (no el máximo del día) — la app la muestra como "en este
// momento", así que tiene que ser el dato de verdad más actual.
async function getUvFromDMC() {
  const usuario = process.env.DMC_USUARIO;
  const token = process.env.DMC_TOKEN;
  const url = `https://climatologia.meteochile.gob.cl/application/servicios/getRecienteUvb/${STATION_CODE}?usuario=${encodeURIComponent(usuario)}&token=${token}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`DMC respondió ${r.status}`);
  const data = await r.json();

  const st = (data.datosRecientes || []).find((s) => s.estacion.codigoNacional === STATION_CODE);
  if (!st) throw new Error(`Estación ${STATION_CODE} no encontrada en la respuesta de la DMC`);
  if (!st.indiceUV.length) throw new Error("Sin lecturas disponibles para la estación");

  const latest = st.indiceUV[st.indiceUV.length - 1];

  return {
    uvIndex: Math.round((parseFloat(latest.indiceUV) || 0) * 10) / 10,
    date: latest.fecha,
    hora: latest.hora,
    station: st.estacion.nombreEstacion,
    source: "Dirección Meteorológica de Chile",
  };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  // Se cachea 15 min: al mostrarse como "en este momento" no puede quedar
  // tan atrás como antes, pero tampoco hace falta pegarle a la DMC en
  // cada carga (ellos mismos actualizan cada 5 min).
  res.setHeader("Cache-Control", "public, max-age=900");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({error: "method not allowed"});

  try {
    const data = await getUvFromDMC();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};
