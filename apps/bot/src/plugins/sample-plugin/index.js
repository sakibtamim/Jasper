export default {
    name: "Sample Plugin",
    version: "1.0.0",
    onLoad: async (context) => {
        context.logger.info("Sample plugin loaded!");
    },
    onUnload: async (context) => {
        context.logger.info("Sample plugin unloaded!");
    }
};
