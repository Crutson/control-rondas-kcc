const admin = require("firebase-admin");

const ALLOWED_ORIGIN = "https://crutson.github.io";
const APP_URL = "https://crutson.github.io/control-rondas-kcc/";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Panic-Secret");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.headers["x-panic-secret"] !== process.env.PANIC_SHARED_SECRET) {
    return res.status(401).json({error: "unauthorized"});
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
        notification: {
          requireInteraction: true,
          icon: `${APP_URL}icons/icon-192.png`,
        },
        fcmOptions: {link: APP_URL},
      },
      tokens,
    };

    const resp = await admin.messaging().sendEachForMulticast(message);

    const staleTokens = [];
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error && r.error.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          staleTokens.push(tokens[i]);
        }
      }
    });
    await Promise.all(
        staleTokens.map((t) => db.collection("push-tokens").doc(t).delete()),
    );

    res.status(200).json({sent: resp.successCount});
  } catch (err) {
    res.status(500).json({error: err.message});
  }
};
