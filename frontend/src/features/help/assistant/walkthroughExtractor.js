export function extractSteps(body) {
  const lines = body.split(/\r?\n/);
  const steps = [];
  let inSteps = false;
  let found = false;

  for (const line of lines) {
    if (/^###\s+Steps/i.test(line)) {
      if (found) break; // only use the first Steps section
      inSteps = true;
      found = true;
      continue;
    }
    if (inSteps && /^###\s/.test(line)) break;
    if (inSteps) {
      const m = line.match(/^\d+\.\s+(.+)$/);
      if (m) steps.push(m[1].trim());
    }
  }

  return steps;
}

// Lightweight inline markdown: convert **bold** → <strong>, keep rest as text
export function renderStepText(text) {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}
