import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const generateQuizQuestions = async (context: string, count: number = 5) => {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured in .env");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Você é um assistente educacional especialista em criar avaliações.
    Com base no conteúdo abaixo, crie um quiz com ${count} questões de múltipla escolha.
    
    CONTEÚDO:
    ${context}

    REGRAS:
    1. Retorne APENAS um JSON válido seguindo a estrutura abaixo.
    2. Cada questão deve ter 4 alternativas.
    3. Exatamente uma alternativa deve ser a correta.
    4. O enunciado deve ser claro e testar o conhecimento do conteúdo.
    5. Não inclua Markdown, blocos de código (como \`\`\`json) ou qualquer texto fora do JSON.

    ESTRUTURA DO JSON:
    [
      {
        "prompt": "Enunciado da questão",
        "options": [
          { "text": "Alternativa A", "isCorrect": false },
          { "text": "Alternativa B", "isCorrect": true },
          { "text": "Alternativa C", "isCorrect": false },
          { "text": "Alternativa D", "isCorrect": false }
        ]
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Clean potential markdown blocks if LLM ignores instructions
    const cleanJson = text.replace(/```json|```/g, "").trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("[GEMINI_AI_ERROR]", error);
    throw new Error("Falha ao gerar questões com IA");
  }
};
