#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const readline = require('readline');
const { parseEnv, substitute } = require('./mcp-utils');

const PROJECT_MCP_PATH = path.join(process.cwd(), 'mcp.json');

function cleanupPorts(ports) {
    console.log('🧹 Cleaning up ports...');
    ports.forEach(port => {
        try {
            // Find PID occupying the port (silence stderr)
            const pid = execSync(`lsof -t -i:${port} -sTCP:LISTEN 2>/dev/null`).toString().trim();
            if (pid) {
                // Kill the process
                process.kill(parseInt(pid, 10), 'SIGKILL');
                console.log(`   - Killed process ${pid} on port ${port}`);
            }
        } catch (e) {
            // Ignore if lsof returns non-zero (no process found) or other errors
        }
    });
}

function main() {
    console.log('🚀 Model Context Protocol (MCP) Inspector Launcher');

    if (!fs.existsSync(PROJECT_MCP_PATH)) {
        console.error('❌ Error: mcp.json not found in project root.');
        process.exit(1);
    }

    let config;
    try {
        config = JSON.parse(fs.readFileSync(PROJECT_MCP_PATH, 'utf8'));
    } catch (e) {
        console.error(`❌ Error: Failed to parse mcp.json: ${e.message}`);
        process.exit(1);
    }

    const servers = config.mcpServers || {};
    const serverKeys = Object.keys(servers);

    if (serverKeys.length === 0) {
        console.error('❌ Error: No servers defined in mcp.json.');
        process.exit(1);
    }

    console.log('\nSelect an MCP server to test:');
    serverKeys.forEach((key, index) => {
        console.log(`${index + 1}) ${key}`);
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(`\nEnter choice [1-${serverKeys.length}]: `, (answer) => {
        const choice = parseInt(answer.trim(), 10);

        if (isNaN(choice) || choice < 1 || choice > serverKeys.length) {
            console.error('❌ Invalid selection.');
            rl.close();
            process.exit(1);
        }

        const selectedKey = serverKeys[choice - 1];
        let serverConfig = servers[selectedKey];

        console.log(`\n👉 Launching Inspector for '${selectedKey}'...`);
        cleanupPorts([6277, 6274]);

        rl.close();

        // Load env vars once
        const fileEnvVars = parseEnv();

        // Variable Substitution
        if (Array.isArray(serverConfig.args)) {
            serverConfig.args = serverConfig.args.map(arg => substitute(arg, fileEnvVars));
        }

        let args = serverConfig.args || [];

        // Special handling for postgres to inject DB URL if missing
        if (selectedKey === 'postgres') {
            const hasUrl = args.some(arg => arg.includes('postgres://') || arg.includes('postgresql://'));
            if (!hasUrl) {
                let dbUrl = process.env.DATABASE_URL || fileEnvVars.DATABASE_URL;
                if (dbUrl) {
                    dbUrl = substitute(dbUrl, fileEnvVars);
                    // Append SSL mode
                    if (!dbUrl.includes('?')) {
                        dbUrl += '?sslmode=disable';
                    } else if (!dbUrl.includes('sslmode=')) {
                        dbUrl += '&sslmode=disable';
                    }
                    args = [...args, dbUrl];
                    console.log('   (Injected DATABASE_URL from .env with sslmode=disable)');
                } else {
                    console.warn('   ⚠️ Warning: No DATABASE_URL found. Inspector may fail.');
                }
            } else {
                // Ensure SSL Mode
                args = args.map(arg => {
                    if ((arg.includes('postgres://') || arg.includes('postgresql://'))) {
                        if (!arg.includes('?')) {
                            return arg + '?sslmode=disable';
                        } else if (!arg.includes('sslmode=')) {
                            return arg + '&sslmode=disable';
                        }
                    }
                    return arg;
                });
            }
        }

        // Special handling for Context7 (Remove empty --api-key)
        if (selectedKey === 'context7' && Array.isArray(args)) {
            const flagIndex = args.indexOf('--api-key');
            if (flagIndex !== -1 && flagIndex + 1 < args.length) {
                const apiKeyValue = args[flagIndex + 1];
                if (!apiKeyValue || apiKeyValue.trim() === '') {
                    console.log('   (Removing empty --api-key argument)');
                    args.splice(flagIndex, 2);
                }
            }
        }

        const command = serverConfig.command;
        const inspectorArgs = ['-y', '@modelcontextprotocol/inspector', command, ...args];

        // Secure spawn without shell: true
        const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';

        const child = spawn(executable, inspectorArgs, {
            stdio: 'inherit'
        });

        child.on('error', (err) => {
            console.error(`❌ Failed to start inspector: ${err.message}`);
        });
    });
}

main();
