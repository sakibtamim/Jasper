import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, "../src/plugins");

const pluginId = process.argv[2];

if (!pluginId) {
  console.error("Usage: pnpm plugin:unlink <plugin-id>");
  process.exit(1);
}

const linkPath = path.join(PLUGINS_DIR, pluginId);

if (!fs.existsSync(linkPath)) {
  console.error(
    `Error: Plugin "${pluginId}" is not installed (path not found: ${linkPath})`,
  );
  process.exit(1);
}

try {
  const stats = fs.lstatSync(linkPath);
  if (!stats.isSymbolicLink()) {
    console.error(
      `Error: "${pluginId}" is a real directory, not a symlink. Use "rm -rf" if you really want to delete it.`,
    );
    process.exit(1);
  }

  fs.unlinkSync(linkPath);
  console.log(`✅ Unlinked plugin "${pluginId}"`);
} catch (error) {
  console.error("Failed to unlink plugin:", error);
  process.exit(1);
}
