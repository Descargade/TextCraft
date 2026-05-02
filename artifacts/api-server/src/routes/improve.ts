import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ImproveTextBody } from "@workspace/api-zod";

const router = Router();

const SYSTEM_PROMPTS: Record<string, string> = {
  professional:
    "You are an expert business writer. Rewrite the provided text to be more professional, formal, and polished. Improve the structure, vocabulary, and tone for a corporate or business context. Return ONLY the improved text without any explanations or preamble.",
  summarize:
    "You are an expert at summarization. Summarize the provided text concisely, keeping all key ideas and important points while significantly reducing the length. Return ONLY the summary without any explanations or preamble.",
  simplify:
    "You are an expert at plain language writing. Rewrite the provided text to be clearer, simpler, and easier to understand. Use shorter sentences, common words, and a conversational tone. Return ONLY the simplified text without any explanations or preamble.",
};

router.post("/improve", async (req, res) => {
  const parsed = ImproveTextBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { text, mode } = parsed.data;

  if (!text.trim()) {
    res.status(400).json({ error: "Text cannot be empty" });
    return;
  }

  const systemPrompt = SYSTEM_PROMPTS[mode];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error calling OpenAI");
    res.write(`data: ${JSON.stringify({ error: "AI processing failed" })}\n\n`);
    res.end();
  }
});

export default router;
