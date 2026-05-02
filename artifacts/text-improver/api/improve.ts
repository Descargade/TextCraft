import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Solo POST permitido" });
  }

  const { text, mode } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Falta el texto" });
  }

  let result = text;

  // Simulación simple (puedes reemplazar luego con OpenAI)
  if (mode === "profesional") {
    result = "Versión profesional: " + text;
  }

  if (mode === "resumir") {
    result = "Resumen: " + text.slice(0, 120) + "...";
  }

  if (mode === "simplificar") {
    result = "Versión simple: " + text;
  }

  return res.status(200).json({
    result,
  });
}