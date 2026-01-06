import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const PLUGINS_SRC_DIR = path.join(ROOT_DIR, "src/plugins");
const PLUGINS_DIST_DIR = path.join(ROOT_DIR, "dist/plugins");

const args = process.argv.slice(2);
const prodFlagIndex = args.indexOf("--prod");
const isProd = prodFlagIndex !== -1;

if (isProd) args.splice(prodFlagIndex, 1);
const ZIP_PATH = args[0];

if (!ZIP_PATH) {
  console.error("Usage: pnpm plugin:import <path-to-zip> [--prod]");
  process.exit(1);
}

if (!fs.existsSync(ZIP_PATH)) {
  console.error(`❌ File not found: ${ZIP_PATH}`);
  process.exit(1);
}

async function main() {
  console.log(`📦 Importing plugin from ${path.basename(ZIP_PATH)}...`);

  const zip = new AdmZip(ZIP_PATH);
  const zipEntries = zip.getEntries();

  // 1. Validate Manifest
  const manifestEntry = zipEntries.find(
    (e) => e.entryName === "jasper-plugin.json",
  );
  if (!manifestEntry) {
    console.error(
      "❌ Invalid plugin: jasper-plugin.json not found in zip root.",
    );
    process.exit(1);
  }

  const manifest = JSON.parse(manifestEntry.getData().toString("utf-8"));
  if (!manifest.id) {
    console.error('❌ Invalid manifest: Missing "id".');
    process.exit(1);
  }

  const pluginId = manifest.id;
  console.log(`   ID: ${pluginId}`);
  console.log(`   Version: ${manifest.version}`);

  // 2. Detect Type (Source vs Compiled)
  const hasIndexTs = zipEntries.some((e) => e.entryName === "index.ts");
  const hasIndexJs = zipEntries.some((e) => e.entryName === "index.js");
  const isSourceZip = hasIndexTs;

  console.log(`   Type: ${isSourceZip ? "Source Code" : "Compiled"}`);

  // 3. Determine Target Directory
  let targetDir = "";

  if (isProd) {
    // Prod Mode -> dist/plugins
    targetDir = path.join(PLUGINS_DIST_DIR, pluginId);
    if (isSourceZip) {
      console.warn(
        "⚠️  Warning: Importing source code into PROD environment. This plugin may not run without compilation.",
      );
    }
  } else {
    // Dev Mode -> src/plugins
    targetDir = path.join(PLUGINS_SRC_DIR, pluginId);
    if (!isSourceZip && hasIndexJs) {
      console.warn(
        "⚠️  Warning: Importing compiled code into DEV environment. You will not be able to edit source.",
      );
    }
  }

  // 4. Extract
  if (fs.existsSync(targetDir)) {
    console.log(`   Removing existing plugin at ${targetDir}...`);
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  console.log(`   Extracting to ${targetDir}...`);
  fs.mkdirSync(targetDir, { recursive: true });
  zip.extractAllTo(targetDir, true);

  console.log(`✅ Plugin ${pluginId} imported successfully!`);
}

main().catch(console.error);
