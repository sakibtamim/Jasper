import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { IPluginStorage } from "@jasper/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Use process.cwd() to ensure we target the persistent volume mounted at root
const STORAGE_ROOT = path.join(process.cwd(), "data", "plugins");

export class PluginStorage implements IPluginStorage {
  private pluginId: string;
  private storageDir: string;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.storageDir = path.join(STORAGE_ROOT, pluginId);
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureDir(): Promise<void> {
    if (!fs.existsSync(this.storageDir)) {
      await fs.promises.mkdir(this.storageDir, { recursive: true });
    }
  }

  /**
   * Save a file to plugin storage
   * @param filename Name of the file
   * @param data File content buffer
   * @returns URI for the saved file (storage://{pluginId}/{filename})
   */
  async save(filename: string, data: Buffer): Promise<string> {
    await this.ensureDir();

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.storageDir, safeFilename);

    await fs.promises.writeFile(filePath, data);

    return `storage://${this.pluginId}/${safeFilename}`;
  }

  /**
   * Get a file from plugin storage
   * @param filename Name of the file
   * @returns File content buffer
   */
  async get(filename: string): Promise<Buffer> {
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.storageDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filename}`);
    }

    return fs.promises.readFile(filePath);
  }

  /**
   * Delete a file from plugin storage
   * @param filename Name of the file
   */
  async delete(filename: string): Promise<void> {
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.storageDir, safeFilename);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  /**
   * List all files in plugin storage
   * @returns Array of filenames
   */
  async list(): Promise<string[]> {
    await this.ensureDir();
    return fs.promises.readdir(this.storageDir);
  }

  /**
   * Resolve a storage URI to filesystem path and web URL
   * @param uri Storage URI (storage://{pluginId}/{filename})
   */
  resolve(uri: string): { fsPath: string; webUrl: string } {
    if (!uri.startsWith("storage://")) {
      throw new Error("Invalid URI format. Must start with storage://");
    }

    const parts = uri.replace("storage://", "").split("/");
    if (parts.length < 2) {
      throw new Error(
        "Invalid URI format. Must be storage://{pluginId}/{filename}",
      );
    }

    const pluginId = parts[0];
    const filename = parts.slice(1).join("/");

    if (pluginId !== this.pluginId) {
      throw new Error(`Cannot resolve URI for different plugin: ${pluginId}`);
    }

    const safeFilename = path.basename(filename);
    const fsPath = path.join(this.storageDir, safeFilename);
    const webUrl = `/api/plugins/${pluginId}/storage/${safeFilename}`;

    return { fsPath, webUrl };
  }
}
