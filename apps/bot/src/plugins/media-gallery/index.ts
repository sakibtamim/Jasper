import { Plugin, PluginContext } from "@jasper/types";

const plugin: Plugin = {
  name: "Media Gallery",
  version: "1.0.0",
  description: "A sample plugin demonstrating the Extension Storage API.",
  onLoad: async (context: PluginContext) => {
    context.logger.info("Media Gallery plugin loaded");
    // Backend doesn't need to do much, storage API is handled by core
  },
  onUnload: async (context: PluginContext) => {
    context.logger.info("Media Gallery plugin unloaded");
  },
};

export default plugin;
