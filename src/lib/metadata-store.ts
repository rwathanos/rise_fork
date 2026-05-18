import { promises as fs } from "fs";
import path from "path";

export type TokenMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url?: string;
  socials?: {
    x?: string;
    telegram?: string;
    discord?: string;
  };
};

const DATA_DIR = path.join(process.cwd(), ".data", "metadata");
const cache = new Map<string, TokenMetadata>();

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function metadataPath(id: string) {
  return path.join(DATA_DIR, `${id}.json`);
}

export async function saveMetadata(id: string, metadata: TokenMetadata) {
  await ensureDir();
  await fs.writeFile(metadataPath(id), JSON.stringify(metadata), "utf8");
  cache.set(id, metadata);
}

export async function getMetadata(id: string) {
  const cached = cache.get(id);
  if (cached) return cached;

  try {
    const raw = await fs.readFile(metadataPath(id), "utf8");
    const metadata = JSON.parse(raw) as TokenMetadata;
    cache.set(id, metadata);
    return metadata;
  } catch {
    return undefined;
  }
}
