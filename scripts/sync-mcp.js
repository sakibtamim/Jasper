const fs = require('fs');
const path = require('path');
const os = require('os');
const { parseEnv, substitute } = require('./mcp-utils');

const PROJECT_MCP_PATH = path.join(process.cwd(), 'mcp.json');
const GLOBAL_MCP_PATH = path.join(os.homedir(), '.gemini/antigravity/mcp_config.json');

function syncMcp() {
    console.log('🔄 Syncing project MCP config to global Antigravity config...');

    // 1. Read Project Config
    if (!fs.existsSync(PROJECT_MCP_PATH)) {
        console.error('❌ Error: mcp.json not found in project root.');
        process.exit(1);
    }

    let projectConfig;
    try {
        projectConfig = JSON.parse(fs.readFileSync(PROJECT_MCP_PATH, 'utf8'));
    } catch (e) {
        console.error('❌ Error: mcp.json contains invalid JSON. Please fix the file and try again.');
        if (e && e.message) {
            console.error(`   Details: ${e.message}`);
        }
        process.exit(1);
    }

    // 2. Read (or Init) Global Config
    let globalConfig = { mcpServers: {} };
    if (fs.existsSync(GLOBAL_MCP_PATH)) {
        try {
            const content = fs.readFileSync(GLOBAL_MCP_PATH, 'utf8');
            globalConfig = JSON.parse(content);
            if (!globalConfig || typeof globalConfig !== 'object') {
                globalConfig = {};
            }
            if (!globalConfig.mcpServers || typeof globalConfig.mcpServers !== 'object') {
                globalConfig.mcpServers = {};
            }
        } catch (e) {
            console.warn('⚠️  Warning: Global config found but invalid/unreadable. Overwriting.');
            globalConfig = { mcpServers: {} };
        }
    } else {
        // Ensure directory exists
        const globalDir = path.dirname(GLOBAL_MCP_PATH);
        if (!fs.existsSync(globalDir)) {
            try {
                fs.mkdirSync(globalDir, { recursive: true });
            } catch (e) {
                console.error(`❌ Error: Could not create directory ${globalDir}: ${e.message}`);
                process.exit(1);
            }
        }
    }

    // 3. Merge Strategies
    const servers = projectConfig.mcpServers || {};
    let addedCount = 0;
    let removedCount = 0;

    // Prune stale servers (e.g. legacy 'prisma-mcp-server') to prevent duplicates.

    // To solve the immediate "two prisma" issue without breaking other potential projects:
    if (globalConfig.mcpServers['prisma'] && globalConfig.mcpServers['prisma-mcp-server']) {
        console.log('   🔸 Detected duplicate Prisma config. Removing legacy "prisma-mcp-server".');
        delete globalConfig.mcpServers['prisma-mcp-server'];
        removedCount++;
    }

    // Load .env vars once
    const fileEnvVars = parseEnv();

    for (const [key, config] of Object.entries(servers)) {
        if (globalConfig.mcpServers[key]) {
            console.log(`   🔸 Overwriting existing configuration for server: ${key}`);
        }

        let serverConfig = structuredClone(config);

        // 1. Filesystem: Resolve relative paths (skipping flags and package names)
        if (key === 'filesystem' && Array.isArray(serverConfig.args)) {
            const newArgs = serverConfig.args.map(arg => {
                if (typeof arg === 'string' && !path.isAbsolute(arg) && !arg.startsWith('-') && !arg.startsWith('@')) {
                    return path.resolve(process.cwd(), arg);
                }
                return arg;
            });
            serverConfig.args = newArgs;
            console.log(`   - Resolved relative paths for 'filesystem' server.`);
        }

        // 2. Generic Variable Substitution (Supports DATABASE_URL, CONTEXT7_API_KEY, etc.)
        if (Array.isArray(serverConfig.args)) {
            serverConfig.args = serverConfig.args.map(arg => substitute(arg, fileEnvVars));
        }

        // 5. Env Block Substitution
        if (serverConfig.env && typeof serverConfig.env === 'object') {
            for (const [envKey, envValue] of Object.entries(serverConfig.env)) {
                serverConfig.env[envKey] = substitute(envValue, fileEnvVars);
            }
        }

        // 6. CWD Resolution
        if (serverConfig.cwd && typeof serverConfig.cwd === 'string' && !path.isAbsolute(serverConfig.cwd)) {
            serverConfig.cwd = path.resolve(process.cwd(), serverConfig.cwd);
        }

        // 3. Postgres: Specific Logic (Injection & SSL)
        if (key === 'postgres' && Array.isArray(serverConfig.args)) {
            const hasUrl = serverConfig.args.some(arg => arg.includes('postgres://') || arg.includes('postgresql://'));

            if (!hasUrl) {
                // Try to formulate URL from env if not explicitly passed
                let dbUrl = process.env.DATABASE_URL || fileEnvVars.DATABASE_URL;
                if (dbUrl) {
                    dbUrl = substitute(dbUrl, fileEnvVars);
                    serverConfig.args.push(dbUrl);
                    console.log(`   - Injected DATABASE_URL from .env not explicitly in args.`);
                }
            }

            // Ensure SSL Mode Warning
            serverConfig.args.forEach(arg => {
                if ((arg.includes('postgres://') || arg.includes('postgresql://'))) {
                    if (!arg.includes('sslmode')) {
                        console.warn('   ⚠️ Warning: No sslmode specified in connection string. It is recommended for security.');
                    }
                }
            });
        }

        // 4. Context7: Special Handling (Remove empty --api-key)
        if (key === 'context7' && Array.isArray(serverConfig.args)) {
            const flagIndex = serverConfig.args.indexOf('--api-key');
            if (flagIndex !== -1 && flagIndex + 1 < serverConfig.args.length) {
                const apiKeyValue = serverConfig.args[flagIndex + 1];
                if (!apiKeyValue || apiKeyValue.trim() === '') {
                    console.log('   - Removing empty --api-key argument (optional).');
                    serverConfig.args.splice(flagIndex, 2);
                }
            }
        }

        globalConfig.mcpServers[key] = serverConfig;
        addedCount++;
        console.log(`   - Synced server: ${key}`);
    }

    // 4. Write Back with Secure Permissions
    try {
        fs.writeFileSync(GLOBAL_MCP_PATH, JSON.stringify(globalConfig, null, 2), { mode: 0o600 });
        console.log(`✅ Successfully synced ${addedCount} servers (Removed: ${removedCount}) to ${GLOBAL_MCP_PATH}`);
    } catch (e) {
        console.error(`❌ Error: Could not write to global config: ${e.message}`);
        process.exit(1);
    }
}

syncMcp();
