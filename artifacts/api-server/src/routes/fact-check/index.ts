import { Router } from "express";
import { ai } from "@workspace/integrations-gemini-ai";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { text, imageBase64, mimeType, url, mode } = req.body as {
      text?: string;
      imageBase64?: string;
      mimeType?: string;
      url?: string;
      mode: string;
    };

    if (!text && !imageBase64 && !url) {
      res.status(400).json({ error: "Provide text, imageBase64, or url" });
      return;
    }

    const systemPrompt = `Você é um verificador de fatos especializado e jornalista investigativo. Sua missão é analisar conteúdo (texto de artigos, jornais, revistas, documentos escaneados ou URLs de QR codes) e avaliar sua precisão factual.

IMPORTANTE: Use a ferramenta de busca do Google para verificar as afirmações em MÚLTIPLAS fontes jornalísticas confiáveis e atualizadas (G1, UOL, Agência Brasil, Reuters, Associated Press, BBC, El País, Folha de S.Paulo, O Globo, Estadão, R7, CNN Brasil, etc.). Sempre busque a informação mais recente disponível.

Após pesquisar nas fontes, retorne uma resposta JSON com EXATAMENTE esta estrutura:
{
  "score": <inteiro 0-100, onde 100 = completamente preciso, 0 = completamente falso>,
  "verdict": <"Verdadeiro" | "Majoritariamente Verdadeiro" | "Misto" | "Enganoso" | "Falso">,
  "summary": <uma frase resumindo sobre o que é o conteúdo>,
  "reasoning": <explicação detalhada da análise, citando as fontes que confirmam ou refutam, em português, 2-5 frases>,
  "claims": [
    {
      "claim": <afirmação específica encontrada no conteúdo>,
      "accurate": <true ou false>,
      "explanation": <breve explicação em português citando a fonte consultada>
    }
  ],
  "sources": [
    {
      "title": <título da fonte consultada>,
      "domain": <domínio da fonte, ex: g1.globo.com>
    }
  ]
}

Regras de pontuação:
- 90-100: Conteúdo factualmente preciso e bem fundamentado em múltiplas fontes
- 70-89: Majoritariamente preciso com pequenos problemas ou contexto faltando
- 40-69: Misto — algumas informações corretas, outras imprecisas ou enganosas
- 20-39: Majoritariamente impreciso ou altamente enganoso
- 0-19: Completamente falso ou fabricado

SEMPRE:
- Responda APENAS com JSON válido, sem markdown
- Escreva reasoning e explicações em português do Brasil
- Extraia e analise 2-5 afirmações específicas do conteúdo
- Seja objetivo e baseado em evidências das fontes consultadas
- Indique quando as informações são recentes (últimas 24h, semana, etc.)`;

    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      });
      parts.push({
        text: "Leia e analise o conteúdo de texto nesta imagem verificando a veracidade factual de todas as afirmações, estatísticas e declarações que conseguir identificar. Use a busca do Google para confirmar cada informação em fontes jornalísticas confiáveis.",
      });
    } else if (url) {
      parts.push({
        text: `Verifique a veracidade do conteúdo desta URL encontrada em um QR code: ${url}\n\nBusque informações sobre esta fonte, seu histórico de credibilidade, e o conteúdo que ela divulga. Consulte múltiplos sites jornalísticos para verificar se as informações são precisas e atualizadas.`,
      });
    } else if (text) {
      parts.push({
        text: `Verifique a veracidade factual do seguinte conteúdo, buscando em múltiplas fontes jornalísticas confiáveis:\n\n${text}`,
      });
    }

    let response;
    let usedGrounding = false;

    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 8192,
          tools: [{ googleSearch: {} }],
        },
      });
      usedGrounding = true;
    } catch {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 8192,
        },
      });
    }

    const rawText = (response.text ?? "").trim();

    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)```/) ??
      rawText.match(/```\s*([\s\S]*?)```/) ??
      rawText.match(/(\{[\s\S]*\})/);

    const jsonStr = jsonMatch ? jsonMatch[1].trim() : rawText;

    let result: {
      score: number;
      verdict: string;
      summary: string;
      reasoning: string;
      claims: Array<{ claim: string; accurate: boolean; explanation: string }>;
      sources?: Array<{ title: string; domain: string }>;
    };

    try {
      result = JSON.parse(jsonStr);
    } catch {
      req.log.warn({ rawText: rawText.slice(0, 500) }, "Failed to parse Gemini JSON response");
      result = {
        score: 50,
        verdict: "Misto",
        summary: "Não foi possível analisar o conteúdo",
        reasoning: "Erro ao processar a resposta da análise.",
        claims: [],
        sources: [],
      };
    }

    const groundingChunks =
      (response as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: Array<{ web?: { title?: string; uri?: string } }> } }> })
        .candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

    const groundingSources = groundingChunks
      .filter((c) => c.web?.uri)
      .map((c) => {
        let domain = "";
        try {
          domain = new URL(c.web!.uri!).hostname.replace("www.", "");
        } catch {
          domain = c.web?.uri ?? "";
        }
        return { title: c.web?.title ?? domain, domain };
      })
      .filter((s, i, arr) => arr.findIndex((x) => x.domain === s.domain) === i)
      .slice(0, 8);

    const mergedSources =
      groundingSources.length > 0
        ? groundingSources
        : Array.isArray(result.sources)
        ? result.sources
        : [];

    res.json({
      score: Math.max(0, Math.min(100, result.score !== undefined && result.score !== null ? Number(result.score) : 50)),
      verdict: result.verdict || "Misto",
      summary: result.summary || "",
      reasoning: result.reasoning || "",
      claims: Array.isArray(result.claims) ? result.claims : [],
      sources: mergedSources,
      usedGrounding,
      analyzedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Fact check failed");
    res.status(500).json({ error: "Failed to analyze content" });
  }
});

export default router;
