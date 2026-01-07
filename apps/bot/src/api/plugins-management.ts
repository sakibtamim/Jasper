import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import logger from "../core/logger.js";
import pluginManager from "../core/plugins/plugin-manager.js";
import { PluginStorage } from "../core/plugins/plugin-storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.resolve(__dirname, "../../plugins");

export default async function pluginsManagementRoutes(server: FastifyInstance) {
  // Register multipart support
  server.register(multipart);

  // List all installed plugins (backend & frontend)
  server.get("/", async (request, reply) => {
    const pluginsMap = pluginManager.getPlugins();
    const pluginsList = Array.from(pluginsMap.values()).map((p) => ({
      id: p.metadata.id,
      name: p.metadata.name,
      version: p.metadata.version,
      description: p.metadata.description,
      web: p.metadata.web, // Include web config to detect frontend plugins
    }));
    return { plugins: pluginsList };
  });

  // --- Storage API ---

  // Get file content
  server.get("/:pluginId/storage/:filename", async (request, reply) => {
    const { pluginId, filename } = request.params as {
      pluginId: string;
      filename: string;
    };
    const storage = new PluginStorage(pluginId);

    try {
      const buffer = await storage.get(filename);
      // Determine content type based on extension (basic)
      const ext = path.extname(filename).toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === ".png") contentType = "image/png";
      if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      if (ext === ".gif") contentType = "image/gif";
      if (ext === ".json") contentType = "application/json";
      if (ext === ".txt") contentType = "text/plain";

      reply.type(contentType);
      return buffer;
    } catch (error) {
      return reply.code(404).send({ message: "File not found" });
    }
  });

  // List files
  server.get("/:pluginId/storage", async (request, reply) => {
    const { pluginId } = request.params as { pluginId: string };
    const storage = new PluginStorage(pluginId);
    try {
      const files = await storage.list();
      return { files };
    } catch (error) {
      return { files: [] };
    }
  });

  // Upload file
  server.post("/:pluginId/storage", async (request, reply) => {
    // Auth check
    const user = (request as unknown as { user: { username: string } }).user;
    if (!user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const { pluginId } = request.params as { pluginId: string };
    const data = await request.file();

    if (!data) {
      return reply.code(400).send({ message: "No file uploaded" });
    }

    const storage = new PluginStorage(pluginId);
    try {
      const buffer = await data.toBuffer();
      const uri = await storage.save(data.filename, buffer);
      const { webUrl } = storage.resolve(uri);
      return { success: true, uri, url: webUrl };
    } catch (error) {
      logger.error(`[storage] Upload failed: ${error}`);
      return reply.code(500).send({ message: "Upload failed" });
    }
  });

  // Delete file
  server.delete("/:pluginId/storage/:filename", async (request, reply) => {
    // Auth check
    const user = (request as unknown as { user: { username: string } }).user;
    if (!user) {
      return reply.code(401).send({ message: "Unauthorized" });
    }

    const { pluginId, filename } = request.params as {
      pluginId: string;
      filename: string;
    };
    const storage = new PluginStorage(pluginId);

    try {
      await storage.delete(filename);
      return { success: true };
    } catch (error) {
      return reply.code(500).send({ message: "Delete failed" });
    }
  });

  server.post("/install", async (request, reply) => {
    // 1. Authentication Check (P0)
    // The global onRequest hook attaches 'user' to the request if a valid session exists.
    const user = (request as unknown as { user: { username: string } }).user;
    if (!user) {
      return reply.code(401).send({
        message: "Unauthorized: You must be logged in to install plugins.",
      });
    }

    // Optional: Add role check here if needed (e.g., if (user.role !== 'admin'))

    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ message: "No file uploaded" });
    }

    if (!data.filename.endsWith(".zip")) {
      return reply.code(400).send({ message: "File must be a .zip archive" });
    }

    const tempExtractDir = path.join(PLUGINS_DIR, `temp_extract_${Date.now()}`);

    try {
      const buffer = await data.toBuffer();
      const zip = new AdmZip(buffer);
      const zipEntries = zip.getEntries();

      // 2. Zip Slip Prevention (P1)
      // Validate all entries before extracting
      for (const entry of zipEntries) {
        const entryName = entry.entryName;
        const targetPath = path.join(tempExtractDir, entryName);

        // Prevent directory traversal attacks
        const resolvedTargetPath = path.resolve(targetPath);
        const resolvedTempDir = path.resolve(tempExtractDir);
        if (!resolvedTargetPath.startsWith(resolvedTempDir + path.sep)) {
          throw new Error(`Malicious zip entry detected: ${entryName}`);
        }
      }

      // If validation passes, extract
      if (!fs.existsSync(tempExtractDir)) {
        await fs.promises.mkdir(tempExtractDir, { recursive: true });
      }

      zip.extractAllTo(tempExtractDir, true);

      // 3. Validate Manifest
      const manifestPath = path.join(tempExtractDir, "jasper-plugin.json");
      if (!fs.existsSync(manifestPath)) {
        throw new Error("Invalid plugin: jasper-plugin.json not found");
      }

      const manifest = JSON.parse(
        await fs.promises.readFile(manifestPath, "utf-8"),
      );
      if (!manifest.id || !/^[a-z0-9-]+$/.test(manifest.id)) {
        throw new Error("Invalid plugin ID in manifest");
      }

      // 4. Move to plugins directory
      const targetDir = path.join(PLUGINS_DIR, manifest.id);

      // Remove existing if any
      if (fs.existsSync(targetDir)) {
        await fs.promises.rm(targetDir, { recursive: true, force: true });
      }

      await fs.promises.rename(tempExtractDir, targetDir);

      logger.info(
        `[plugins] Installed plugin: ${manifest.id} v${manifest.version} by ${user.username}`,
      );

      return {
        success: true,
        message: `Plugin ${manifest.id} installed successfully`,
      };
    } catch (error) {
      logger.error(`[plugins] Installation failed: ${error}`);
      return reply.code(500).send({
        message: "Installation failed. Check server logs for details.",
      });
    } finally {
      // Cleanup
      if (fs.existsSync(tempExtractDir)) {
        await fs.promises
          .rm(tempExtractDir, { recursive: true, force: true })
          .catch((err) => {
            logger.warn(
              `[plugins] Failed to clean up temp directory ${tempExtractDir}: ${err}`,
            );
          });
      }
    }
  });
}
