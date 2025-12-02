# Contributing to Jasper

First off, thanks for taking the time to contribute! 🎉

Jasper is a community-driven project, and we welcome contributions of all kinds: bug fixes, feature suggestions, documentation improvements, and new plugins.

## 💬 Join the Community

The best way to get started is to join our Discord server. It's where we discuss development, share ideas, and help each other out.

👉 **[Join the Jasper Discord](https://discord.gg/3B8fPPETKY)**

## 🛠️ Development Setup

Jasper is a monorepo managed with `pnpm` and `turborepo`.

1.  **Fork and Clone**
    ```bash
    git clone https://github.com/YOUR_USERNAME/Jasper.git
    cd Jasper
    ```

2.  **Install Dependencies**
    ```bash
    pnpm install
    ```

3.  **Start Development**
    ```bash
    pnpm dev
    ```

## 🧩 Creating a Plugin

Jasper is built to be extensible. To create a new plugin:

1.  Create a folder in `apps/bot/src/plugins/your-plugin`.
2.  Add an `index.ts` that exports the plugin interface.
3.  Register your plugin in `apps/bot/src/config/plugins.ts` (or let the auto-discovery handle it if configured).

See [PLUGINS_DEV.md](PLUGINS_DEV.md) for a detailed guide.

## 📝 Pull Request Guidelines

1.  **Keep it focused**: One feature or fix per PR.
2.  **Test your changes**: Ensure the bot builds and runs locally.
3.  **Update docs**: If you change behavior, update the relevant documentation.
4.  **Follow the style**: We use ESLint and Prettier. Run `pnpm lint` before submitting.

## 🐛 Reporting Bugs

If you find a bug, please open an issue on GitHub. Include:
- Steps to reproduce
- Expected vs. actual behavior
- Logs or screenshots

---

Happy coding! 🐈‍⬛
