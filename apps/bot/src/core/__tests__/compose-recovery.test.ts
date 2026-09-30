import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Production Self-Host Compose & Disaster Recovery (HJ-OSS-19)', () => {
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const composePath = path.join(projectRoot, 'docker-compose.yml');
    const dockerfilePath = path.join(projectRoot, 'Dockerfile');
    const backupScriptPath = path.join(projectRoot, 'scripts/backup.sh');
    const restoreScriptPath = path.join(projectRoot, 'scripts/restore.sh');

    describe('Docker Compose Configuration', () => {
        it('should have a valid docker-compose.yml file', () => {
            expect(fs.existsSync(composePath)).toBe(true);
            const content = fs.readFileSync(composePath, 'utf8');
            expect(content.length).toBeGreaterThan(100);
        });

        it('should parse cleanly as valid YAML and contain expected service topology', () => {
            // Use python3 yaml.safe_load for strict YAML specification validation
            const script = `
import json, yaml
with open('${composePath}', 'r') as f:
    data = yaml.safe_load(f)
print(json.dumps({
    'services': list(data.get('services', {}).keys()),
    'networks': data.get('networks', {}),
    'volumes': list(data.get('volumes', {}).keys()),
    'jasper_bot': data.get('services', {}).get('jasper-bot', {}),
    'jasper_worker': data.get('services', {}).get('jasper-worker', {}),
    'postgres': data.get('services', {}).get('postgres', {}),
    'minio': data.get('services', {}).get('minio', {})
}))
`;
            const result = spawnSync('python3', ['-c', script], { encoding: 'utf8' });
            expect(result.status).toBe(0);

            const parsed = JSON.parse(result.stdout);
            expect(parsed.services).toContain('jasper-bot');
            expect(parsed.services).toContain('jasper-worker');
            expect(parsed.services).toContain('postgres');
            expect(parsed.services).toContain('minio');

            // 1. Healthcheck verification
            const botHealth = parsed.jasper_bot.healthcheck;
            expect(botHealth).toBeDefined();
            expect(JSON.stringify(botHealth.test)).toMatch(/health\/(ready|live)/);

            const workerHealth = parsed.jasper_worker.healthcheck;
            expect(workerHealth).toBeDefined();
            expect(JSON.stringify(workerHealth.test)).toMatch(/health\/live/);

            const postgresHealth = parsed.postgres.healthcheck;
            expect(postgresHealth).toBeDefined();
            expect(JSON.stringify(postgresHealth.test)).toMatch(/pg_isready/);

            const minioHealth = parsed.minio.healthcheck;
            expect(minioHealth).toBeDefined();
            expect(JSON.stringify(minioHealth.test)).toMatch(/mc ready|health\/live/);

            // 2. Network Isolation
            expect(parsed.networks['jasper-internal']).toBeDefined();
            expect(parsed.networks['jasper-internal'].internal).toBe(true);
            // Postgres must only be connected to the internal network
            expect(parsed.postgres.networks).toEqual(['jasper-internal']);

            // 3. Non-root user execution
            expect(parsed.jasper_bot.user).toBe('10001:10001');
            expect(parsed.jasper_worker.user).toBe('10001:10001');
            expect(parsed.postgres.user).toBe('postgres');
            expect(parsed.minio.user).toBe('10001:10001');

            // 4. Resource limits (deploy.resources.limits)
            expect(parsed.jasper_bot.deploy?.resources?.limits?.memory).toBeDefined();
            expect(parsed.jasper_bot.deploy?.resources?.limits?.cpus).toBeDefined();
            expect(parsed.jasper_worker.deploy?.resources?.limits?.memory).toBeDefined();
            expect(parsed.postgres.deploy?.resources?.limits?.memory).toBeDefined();
            expect(parsed.minio.deploy?.resources?.limits?.memory).toBeDefined();

            // 5. Persistent Volumes
            expect(parsed.volumes).toContain('postgres_data');
            expect(parsed.volumes).toContain('minio_data');
            expect(parsed.volumes).toContain('jasper_data');
            expect(parsed.volumes).toContain('jasper_worker_data');

            // 6. Restart policies
            expect(parsed.jasper_bot.restart).toBe('unless-stopped');
            expect(parsed.postgres.restart).toBe('unless-stopped');
            expect(parsed.minio.restart).toBe('unless-stopped');
        });
    });

    describe('Production Dockerfile', () => {
        it('should have a production multi-stage Dockerfile with non-root security', () => {
            expect(fs.existsSync(dockerfilePath)).toBe(true);
            const content = fs.readFileSync(dockerfilePath, 'utf8');

            expect(content).toMatch(/FROM node:24.*AS builder/);
            expect(content).toMatch(/FROM node:24.*AS runner/);
            expect(content).toMatch(/USER (node|jasper)/);
            expect(content).toMatch(/HEALTHCHECK/);
            expect(content).toMatch(/ffmpeg/);
        });
    });

    describe('Disaster Recovery Scripts (Backup & Restore)', () => {
        it('should have executable backup and restore scripts', () => {
            expect(fs.existsSync(backupScriptPath)).toBe(true);
            expect(fs.existsSync(restoreScriptPath)).toBe(true);

            // Verify executable permissions
            fs.accessSync(backupScriptPath, fs.constants.X_OK);
            fs.accessSync(restoreScriptPath, fs.constants.X_OK);
        });

        it('should perform atomic backup with SHA-256 manifest and restore idempotently', () => {
            const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dr-test-'));
            const dataDir = path.join(sandboxDir, 'data');
            const storageDir = path.join(dataDir, 'storage');
            const pluginsDir = path.join(dataDir, 'plugins');
            const backupOutputDir = path.join(sandboxDir, 'backups');
            const sqlitePath = path.join(dataDir, 'jasper.sqlite');

            fs.mkdirSync(storageDir, { recursive: true });
            fs.mkdirSync(pluginsDir, { recursive: true });
            fs.mkdirSync(backupOutputDir, { recursive: true });

            // Create initial state
            fs.writeFileSync(sqlitePath, 'SAMPLE_SQLITE_HEADER_DATA_12345\n');
            fs.writeFileSync(path.join(storageDir, 'track-01.mp3'), 'audio-data-payload-12345');
            fs.writeFileSync(path.join(pluginsDir, 'soundboard.json'), '{"enabled":true}');

            // 1. Run backup
            const backupCmd = `DB_TYPE=sqlite SQLITE_PATH="${sqlitePath}" DATA_DIR="${dataDir}" STORAGE_DIR="${storageDir}" PLUGINS_DIR="${pluginsDir}" BACKUP_OUTPUT_DIR="${backupOutputDir}" "${backupScriptPath}"`;
            const backupRes = execSync(backupCmd, { encoding: 'utf8' });
            expect(backupRes).toMatch(/Backup created successfully!/);

            // Verify backup archive and sha256 file
            const backupFiles = fs.readdirSync(backupOutputDir);
            const archiveFile = backupFiles.find(
                (f) => f.startsWith('jasper-backup_') && f.endsWith('.tar.gz'),
            );
            expect(archiveFile).toBeDefined();

            const fullArchivePath = path.join(backupOutputDir, archiveFile!);
            const checksumFile = `${fullArchivePath}.sha256`;
            expect(fs.existsSync(checksumFile)).toBe(true);

            // Verify archive contents (manifest.sha256, manifest.json, metadata.json)
            const inspectRes = execSync(`tar -tf "${fullArchivePath}"`, { encoding: 'utf8' });
            expect(inspectRes).toContain('manifest.sha256');
            expect(inspectRes).toContain('manifest.json');
            expect(inspectRes).toContain('metadata.json');
            expect(inspectRes).toContain('database.sqlite');
            expect(inspectRes).toContain('storage.tar.gz');

            // 2. Perform Restore into isolated target
            const restoredSqlite = path.join(sandboxDir, 'restored.sqlite');
            const restoredStorage = path.join(sandboxDir, 'restored_storage');
            fs.mkdirSync(restoredStorage, { recursive: true });

            const restoreCmd = `STORAGE_DIR="${restoredStorage}" "${restoreScriptPath}" "${fullArchivePath}" -f --sqlite-path "${restoredSqlite}"`;
            const restoreRes = execSync(restoreCmd, { encoding: 'utf8' });
            expect(restoreRes).toMatch(/Integrity check PASSED/);
            expect(restoreRes).toMatch(
                /restoration procedure completed successfully and idempotently/,
            );

            // Verify restored data integrity
            expect(fs.existsSync(restoredSqlite)).toBe(true);
            expect(fs.readFileSync(restoredSqlite, 'utf8')).toBe(
                'SAMPLE_SQLITE_HEADER_DATA_12345\n',
            );

            expect(fs.existsSync(path.join(restoredStorage, 'track-01.mp3'))).toBe(true);
            expect(fs.readFileSync(path.join(restoredStorage, 'track-01.mp3'), 'utf8')).toBe(
                'audio-data-payload-12345',
            );

            // 3. Test Idempotency (run restore a second time on same target)
            const secondRestoreRes = execSync(restoreCmd, { encoding: 'utf8' });
            expect(secondRestoreRes).toMatch(/Integrity check PASSED/);
            expect(fs.readFileSync(restoredSqlite, 'utf8')).toBe(
                'SAMPLE_SQLITE_HEADER_DATA_12345\n',
            );

            // 4. Test Tamper Detection (Corrupting backup should trigger exit code 2)
            const tamperedDir = path.join(sandboxDir, 'tamper_workspace');
            fs.mkdirSync(tamperedDir, { recursive: true });
            execSync(`tar -xzf "${fullArchivePath}" -C "${tamperedDir}"`);
            // Tamper with database.sqlite
            fs.appendFileSync(path.join(tamperedDir, 'database.sqlite'), 'TAMPER_INJECTION');
            const tamperedArchive = path.join(sandboxDir, 'tampered.tar.gz');
            execSync(`tar -czf "${tamperedArchive}" -C "${tamperedDir}" .`);

            const tamperAttempt = spawnSync(
                restoreScriptPath,
                [tamperedArchive, '-f', '--sqlite-path', restoredSqlite],
                {
                    encoding: 'utf8',
                },
            );
            expect(tamperAttempt.status).toBe(2);
            expect(tamperAttempt.stderr || tamperAttempt.stdout).toMatch(/PRE-FLIGHT CHECK FAILED/);

            // Cleanup
            fs.rmSync(sandboxDir, { recursive: true, force: true });
        });
    });
});
