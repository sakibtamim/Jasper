/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

const MANIFEST_PATH = path.join(__dirname, '..', '.agents', 'skills.manifest.json');
const PROJECT_SKILLS_ROOT = path.join(__dirname, '..', '.agents', 'skills');
const GLOBAL_SKILLS_ROOT = path.join(os.homedir(), '.gemini', 'config', 'skills');

const isCheckOnly = process.argv.includes('--check');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return resolve(fetchUrl(res.headers.location));
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
                }
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => resolve(data));
            })
            .on('error', reject);
    });
}

function validateFrontmatter(content, skillName) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
        throw new Error(`Skill ${skillName} is missing valid YAML frontmatter (--- ... ---)`);
    }
    const yaml = match[1];
    if (!yaml.includes('name:')) {
        throw new Error(`Skill ${skillName} frontmatter is missing 'name:' field`);
    }
    if (!yaml.includes('description:')) {
        throw new Error(`Skill ${skillName} frontmatter is missing 'description:' field`);
    }
    return true;
}

function ensureSymlink(targetPath, linkPath) {
    try {
        const linkDir = path.dirname(linkPath);
        if (!fs.existsSync(linkDir)) {
            fs.mkdirSync(linkDir, { recursive: true });
        }
        if (fs.existsSync(linkPath) || fs.lstatSync(linkPath).isSymbolicLink()) {
            return;
        }
    } catch {
        // Link doesn't exist, proceed
    }

    try {
        const relTarget = path.relative(path.dirname(linkPath), targetPath);
        fs.symlinkSync(relTarget, linkPath);
        console.log(`   🔗 Linked: ${path.relative(process.cwd(), linkPath)} -> ${relTarget}`);
    } catch (err) {
        console.warn(`   ⚠️ Warning: Could not create symlink ${linkPath}: ${err.message}`);
    }
}

async function syncSkills() {
    console.log('🤖 Agent Skills Synchronization Engine');
    console.log('=======================================');

    if (!fs.existsSync(MANIFEST_PATH)) {
        console.error(`❌ Manifest not found at: ${MANIFEST_PATH}`);
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const { sources, skills } = manifest;

    let successCount = 0;
    let errorCount = 0;

    for (const [skillKey, config] of Object.entries(skills)) {
        const source = sources[config.source];
        if (!source) {
            console.error(`❌ Unknown source '${config.source}' for skill '${skillKey}'`);
            errorCount++;
            continue;
        }

        const targetName = config.name || skillKey;
        const targetDir =
            config.scope === 'global'
                ? path.join(GLOBAL_SKILLS_ROOT, targetName)
                : path.join(PROJECT_SKILLS_ROOT, targetName);

        console.log(`\n📦 Processing [${config.scope.toUpperCase()}] skill: ${targetName}`);
        console.log(`   Source: ${source.repo} (${config.sourcePath})`);

        if (isCheckOnly) {
            const skillFile = path.join(targetDir, 'SKILL.md');
            if (fs.existsSync(skillFile)) {
                console.log(`   ✅ Validated (already present)`);
                successCount++;
            } else {
                console.error(`   ❌ Missing on disk`);
                errorCount++;
            }
            continue;
        }

        try {
            fs.mkdirSync(targetDir, { recursive: true });

            for (const file of config.files) {
                const fileUrl = `${source.baseUrl}/${config.sourcePath}/${file}`;
                const destPath = path.join(targetDir, file);
                const destDir = path.dirname(destPath);

                fs.mkdirSync(destDir, { recursive: true });

                console.log(`   ⬇️  Fetching: ${file}`);
                let content = await fetchUrl(fileUrl);

                if (file === 'SKILL.md') {
                    // Update name in frontmatter if aliased
                    if (config.name) {
                        content = content.replace(/^name:\s*.+$/m, `name: ${config.name}`);
                    }

                    // Apply overlay if specified
                    if (config.overlay) {
                        const overlayPath = path.join(__dirname, '..', config.overlay);
                        if (fs.existsSync(overlayPath)) {
                            const overlayContent = fs.readFileSync(overlayPath, 'utf8');
                            content = `${content.trim()}\n\n---\n${overlayContent.trim()}\n`;
                            console.log(`   🧩 Applied project overlay: ${config.overlay}`);
                        }
                    }

                    // Validate frontmatter
                    validateFrontmatter(content, targetName);
                }

                fs.writeFileSync(destPath, content, 'utf8');
            }

            console.log(`   ✅ Successfully synced ${targetName}`);
            successCount++;
        } catch (err) {
            console.error(`   ❌ Failed to sync ${targetName}: ${err.message}`);
            errorCount++;
        }
    }

    // Ensure Cross-Tool Directory Symlinks for Project Skills
    if (!isCheckOnly) {
        console.log('\n🔗 Setting up Cross-Tool Interoperability Symlinks...');
        ensureSymlink(PROJECT_SKILLS_ROOT, path.join(__dirname, '..', '.cursor', 'skills'));
        ensureSymlink(PROJECT_SKILLS_ROOT, path.join(__dirname, '..', '.claude', 'skills'));

        // Setup .agent/skills symlink if .agent exists
        const agentDir = path.join(__dirname, '..', '.agent');
        if (fs.existsSync(agentDir)) {
            ensureSymlink(PROJECT_SKILLS_ROOT, path.join(agentDir, 'skills'));
        }
    }

    console.log('\n=======================================');
    console.log(`🏁 Done: ${successCount} synced, ${errorCount} errors`);

    if (errorCount > 0) {
        process.exit(1);
    }
}

syncSkills().catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
});
