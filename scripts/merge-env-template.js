#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('node:fs');
const path = require('node:path');

const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=/;
const APPEND_HEADER = '# Added from .env.example by quick-start to keep local envs current.';

function usage() {
    console.error('Usage: merge-env-template.js <template-env> <target-env>');
    process.exit(1);
}

function getEnvKeys(content) {
    const keys = new Set();
    for (const line of content.split(/\r?\n/)) {
        if (!ENV_KEY_PATTERN.test(line)) {
            continue;
        }
        keys.add(line.slice(0, line.indexOf('=')));
    }
    return keys;
}

function main() {
    const [templateEnvFile, targetEnvFile] = process.argv.slice(2);

    if (!templateEnvFile || !targetEnvFile) {
        usage();
    }

    const absoluteTemplatePath = path.resolve(templateEnvFile);
    const absoluteTargetPath = path.resolve(targetEnvFile);

    if (!fs.existsSync(absoluteTemplatePath)) {
        throw new Error(`Template env file not found: ${absoluteTemplatePath}`);
    }

    if (!fs.existsSync(absoluteTargetPath)) {
        throw new Error(`Target env file not found: ${absoluteTargetPath}`);
    }

    const templateContent = fs.readFileSync(absoluteTemplatePath, 'utf8');
    const targetContent = fs.readFileSync(absoluteTargetPath, 'utf8');
    const existingKeys = getEnvKeys(targetContent);
    const linesToAppend = [];
    const addedKeys = [];

    for (const line of templateContent.split(/\r?\n/)) {
        if (!ENV_KEY_PATTERN.test(line)) {
            continue;
        }

        const key = line.slice(0, line.indexOf('='));
        if (existingKeys.has(key)) {
            continue;
        }

        linesToAppend.push(line);
        addedKeys.push(key);
        existingKeys.add(key);
    }

    if (linesToAppend.length === 0) {
        return;
    }

    let nextContent = targetContent;

    nextContent = nextContent.trimEnd();
    if (nextContent.length > 0) {
        nextContent += '\n\n';
    }

    nextContent += `${APPEND_HEADER}\n${linesToAppend.join('\n')}\n`;

    fs.writeFileSync(absoluteTargetPath, nextContent, 'utf8');

    for (const key of addedKeys) {
        process.stdout.write(`${key}\n`);
    }
}

try {
    main();
} catch (error) {
    console.error(error.message);
    process.exit(1);
}
