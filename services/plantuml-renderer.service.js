const plantumlEncoder = require('plantuml-encoder');

class PlantUmlRenderingError extends Error {
  constructor(message, cause) { super(message, { cause }); this.name = 'PlantUmlRenderingError'; }
}

function validateSvg(svg) {
  if (typeof svg !== 'string' || !/<svg\b[\s\S]*<\/svg>/i.test(svg)) throw new PlantUmlRenderingError('Le moteur de rendu a retourné un SVG invalide');
  if (/<script\b|<foreignObject\b|\son\w+\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?:javascript:|data:text\/html)/i.test(svg)) throw new PlantUmlRenderingError('Le SVG retourné contient un contenu interdit');
  return svg;
}

async function renderSvg(plantUml) {
  const serverUrl = process.env.PLANTUML_SERVER_URL?.replace(/\/$/, '');
  if (!serverUrl) throw new PlantUmlRenderingError('Le moteur de rendu PlantUML n’est pas configuré');
  let encoded;
  try { encoded = plantumlEncoder.encode(plantUml); }
  catch (error) { throw new PlantUmlRenderingError('Impossible d’encoder le diagramme PlantUML', error); }
  try {
    const response = await fetch(`${serverUrl}/svg/${encoded}`, { headers: { Accept: 'image/svg+xml' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new PlantUmlRenderingError('Le moteur de rendu PlantUML a refusé la requête');
    return validateSvg(await response.text());
  } catch (error) {
    if (error instanceof PlantUmlRenderingError) throw error;
    throw new PlantUmlRenderingError('Le moteur de rendu PlantUML est indisponible', error);
  }
}

module.exports = { renderSvg, validateSvg, PlantUmlRenderingError };
