import db from "../src/core/db/index.js";
import { getPluginStatuses } from "./plugin-utils.js";

async function listPlugins() {
  try {
    await db.init();
    const plugins = await getPluginStatuses();

    if (plugins.length === 0) {
      console.log("No plugins found.");
      return;
    }

    console.table(plugins);
  } catch (error) {
    console.error("Failed to list plugins:", error);
  } finally {
    await db.close();
  }
}

listPlugins();
