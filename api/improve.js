export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { text, mode } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Missing text" });
  }

  let result = "";

  if (mode === "profesional") {
    result = "Versión profesional: " + text;
  }

  if (mode === "resumir") {
    result = "Resumen: " + text.slice(0, 120);
  }

  if (mode === "simplificar") {
    result = "Versión simple: " + text;
  }

  return res.status(200).json({ result });
}