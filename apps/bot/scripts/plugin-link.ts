import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, "../src/plugins");

const targetPath = process.argv[2];

if (!targetPath) {
  console.error("Usage: pnpm plugin:link <path-to-plugin>");
  process.exit(1);
}

const absoluteTargetPath = path.resolve(process.cwd(), targetPath);

if (!fs.existsSync(absoluteTargetPath)) {
  console.error(`Error: Target path does not exist: ${absoluteTargetPath}`);
  process.exit(1);
}

const manifestPath = path.join(absoluteTargetPath, "jasper-plugin.json");
if (!fs.existsSync(manifestPath)) {
  console.error(
    `Error: Target directory does not contain a jasper-plugin.json file.`,
  );
  process.exit(1);
}

try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const pluginId = manifest.id;

  if (!pluginId) {
    console.error('Error: jasper-plugin.json is missing the "id" field.');
    process.exit(1);
  }

  const linkPath = path.join(PLUGINS_DIR, pluginId);

  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      console.log(`Removing existing symlink for ${pluginId}...`);
      fs.unlinkSync(linkPath);
    } else {
      console.error(
        `Error: A directory already exists at ${linkPath}. Please remove it manually.`,
      );
      process.exit(1);
    }
  }

  // Create the symlink
  fs.symlinkSync(absoluteTargetPath, linkPath, "dir");
  console.log(`✅ Linked plugin "${pluginId}" from ${absoluteTargetPath}`);
} catch (error) {
  console.error("Failed to link plugin:", error);
  process.exit(1);
}
