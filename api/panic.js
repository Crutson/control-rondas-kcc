const admin = require("firebase-admin");

const ALLOWED_ORIGIN = "https://crutson.github.io";
const APP_URL = "https://crutson.github.io/control-rondas-kcc/";

// Cuántas veces se reenvía el push y con qué separación — cada envío hace
// sonar/vibrar de nuevo la notificación en el celular (gracias a
// "renotify" en el service worker), simulando una alarma que insiste
// aunque la app esté cerrada. Un solo push del sistema no repite solo.
const BURST_COUNT = 6;
const BURST_DELAY_MS = 3000;

module.exports.config = {maxDuration: 30};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Panic-Secret");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.headers["x-panic-secret"] !== process.env.PANIC_SHARED_SECRET) {
    return res.status(401).json({error: "unauthorized"});
  }

  if (req.method === "GET" && req.query && req.query.debug === "1") {
    const db = admin.firestore();
    const snap = await db.collection("push-tokens").get();
    const now = Date.now();
    return res.status(200).json({
      count: snap.size,
      tokens: snap.docs.map((d) => ({
        tokenPreview: d.id.slice(0, 12) + "…",
        role: d.data().role,
        guardName: d.data().guardName,
        minutesAgo: Math.round((now - (d.data().updatedAt || 0)) / 60000),
      })),
    });
  }

  if (req.method !== "POST") return res.status(405).json({error: "method not allowed"});

  const guard = (req.body && req.body.guard) || "Guardia";

  try {
    const db = admin.firestore();
    const tokensSnap = await db.collection("push-tokens").get();
    if (tokensSnap.empty) return res.status(200).json({sent: 0});

    const tokens = tokensSnap.docs.map((d) => d.id);

    const message = {
      notification: {
        title: "🚨 Alerta de pánico",
        body: `${guard} activó el botón de pánico`,
      },
      webpush: {
        headers: {Urgency: "high"},
        notification: {
          requireInteraction: true,
          renotify: true,
          tag: "panico",
          icon: `${APP_URL}icons/icon-192.png`,
        },
        fcmOptions: {link: APP_URL},
      },
      tokens,
    };

    const staleTokens = new Set();
    let lastSuccessCount = 0;

    for (let i = 0; i < BURST_COUNT; i++) {
      if (i > 0) await sleep(BURST_DELAY_MS);
      const resp = await admin.messaging().sendEachForMulticast(message);
      lastSuccessCount = resp.successCount;
      resp.responses.forEach((r, idx) => {
        if (!r.success) {
          const code = r.error && r.error.code;
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            staleTokens.add(tokens[idx]);
          }
        }
      });
    }

    await Promise.all(
        Array.from(staleTokens).map((t) => db.collection("push-tokens").doc(t).delete()),
    );

    res.status(200).json({sent: lastSuccessCount, bursts: BURST_COUNT});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};
