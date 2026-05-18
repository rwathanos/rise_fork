function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function badgeSeedText(symbol?: string, fallback?: string) {
  const raw = (symbol?.trim() || fallback?.trim() || "R").toUpperCase();
  return raw.slice(0, 2);
}

export function badgeGradient(seed: string) {
  const palettes = [
    ["#8CD6FF", "#5A9CFF"],
    ["#9BFFE3", "#45D9B7"],
    ["#C6A4FF", "#8C6DFF"],
    ["#FFC79A", "#FF9D6A"],
  ] as const;
  const idx = hashString(seed) % palettes.length;
  return palettes[idx];
}

