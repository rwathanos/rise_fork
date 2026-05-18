export function pickCoverArt(seed?: string) {
  const covers = [
    "/visuals/cover-1.svg",
    "/visuals/cover-2.svg",
    "/visuals/cover-3.svg",
    "/visuals/cover-4.svg",
  ] as const;

  if (!seed) return covers[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return covers[hash % covers.length];
}
