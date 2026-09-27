class AIServiceError extends Error {
  constructor(message, cause) { super(message, { cause }); this.name = 'AIServiceError'; }
}

async function generateText({ systemPrompt, userPrompt }) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = (process.env.AI_API_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gemini-2.5-flash';
  if (!apiKey) throw new AIServiceError('Le service IA n’est pas configuré');

  const url = `${apiUrl}/models/${encodeURIComponent(model)}:generateContent`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
      }),
      signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) {
      const providerError = await response.text();
      console.error(`Erreur fournisseur IA (${response.status}):`, providerError.slice(0, 500));
      throw new AIServiceError('Le fournisseur IA a refusé la génération');
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
    if (!text) throw new AIServiceError('Le fournisseur IA a retourné une réponse vide');
    return text;
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    console.error('Erreur de communication avec le fournisseur IA:', error);
    throw new AIServiceError('Le service IA est temporairement indisponible', error);
  }
}

module.exports = { generateText, AIServiceError };
