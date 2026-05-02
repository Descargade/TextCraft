export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { text, mode } = req.body;

  return res.status(200).json({
    result: `Procesado (${mode}): ${text}`,
  });
}