------------------------------------------------------------
Comment #2778988034 by chatgpt-codex-connector[bot] on tsconfig.json:N/A
State: N/A | Created: 2026-02-08T09:22:51Z

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Point root tsconfig to an existing base config**

The new root `tsconfig.json` extends `../../tsconfig.base.json`, which resolves to `/tsconfig.base.json` from the repo root and does not exist in this tree. Any tooling that loads the root config (for example `tsc -p tsconfig.json` or editor TypeScript project discovery) will fail to resolve compiler options, so this change breaks the monorepo’s top-level TypeScript configuration.

Useful? React with 👍 / 👎.

Code context:
@@ -1,20 +1,10 @@
 {
-    "files": [],
-    "references": [
-        {
-            "path": "./apps/bot"
-        },
-        {
-            "path": "./apps/web"
-        },
-        {
-            "path": "./packages/config"
-        },
-        {
-            "path": "./packages/elements"
-        },
-        {
-            "path": "./packages/ui"
-        }
-    ]
-}
\ No newline at end of file
+    "extends": "../../tsconfig.base.json",

---

---

Comment #2778988038 by chatgpt-codex-connector[bot] on .husky/pre-commit:N/A
State: N/A | Created: 2026-02-08T09:22:51Z

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub> Declare lint-staged for the pre-commit hook**

Switching the hook to `npx lint-staged` without adding `lint-staged` to root dependencies makes commits depend on ad-hoc remote package resolution instead of the lockfile. In environments without npm registry access (or with restricted CI/dev networking), `git commit` will fail at the hook step because the tool is not installed locally.

Useful? React with 👍 / 👎.

Code context:
@@ -1 +1 @@
-pnpm turbo run lint
+npx lint-staged
