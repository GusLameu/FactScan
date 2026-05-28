import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

const CATEGORIES: Record<string, string> = {
  saude: "Saúde & Bem-estar",
  ciencia: "Ciência",
  dinheiro: "Finanças & Dinheiro",
  natureza: "Natureza & Meio Ambiente",
  tecnologia: "Tecnologia",
  historia: "História",
  alimentacao: "Alimentação & Nutrição",
  psicologia: "Psicologia & Mente",
  corpo: "Corpo Humano",
  idiomas: "Idiomas & Linguagem",
};

const SYSTEM_PROMPT = `Você é um especialista em curiosidades úteis e práticas do cotidiano. Sua missão é gerar UMA curiosidade interessante, surpreendente e diretamente aplicável à vida das pessoas.

A curiosidade deve ser:
- Factualmente precisa e verificável
- Surpreendente ou contra-intuitiva (desperte o "não sabia disso!")
- Diretamente útil para o dia a dia
- Escrita em português do Brasil, linguagem clara e acessível

Retorne APENAS um JSON válido com EXATAMENTE esta estrutura (sem markdown, sem texto fora do JSON):
{
  "emoji": "<emoji relevante e vibrante para a categoria>",
  "category": "<nome da categoria em português>",
  "title": "<título curto e impactante, máx 8 palavras>",
  "fact": "<a curiosidade principal em 2-3 frases claras e envolventes>",
  "why": "<por que isso importa no dia a dia, 1-2 frases>",
  "tip": "<um conselho prático e específico que a pessoa pode aplicar hoje mesmo>",
  "source": "<área do conhecimento ou referência geral, ex: 'Neurociência', 'Harvard Medical School', 'IBGE 2024'>"
}`;

router.get("/", async (req, res) => {
  const categoryKey = (req.query.category as string ?? "").toLowerCase().trim();
  const categoryName = CATEGORIES[categoryKey];

  const userPrompt = categoryName
    ? `Gere uma curiosidade útil e prática sobre a categoria: "${categoryName}". A curiosidade deve ser específica, verificável e aplicável ao cotidiano brasileiro.`
    : `Gere uma curiosidade útil e prática de QUALQUER categoria (${Object.values(CATEGORIES).join(", ")}). Escolha algo surpreendente e aplicável ao cotidiano brasileiro.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: { systemInstruction: SYSTEM_PROMPT },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    });

    const raw = response.text ?? "";
    const json = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const data = JSON.parse(json);

    res.json({
      ...data,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "curiosidades generation failed");
    res.status(500).json({ error: "Falha ao gerar curiosidade. Tente novamente." });
  }
});

export default router;
