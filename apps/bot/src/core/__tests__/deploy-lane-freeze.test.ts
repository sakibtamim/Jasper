import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Legacy Deploy Lane Retirement (HJ-OSS-18 / HJ-OSS-16)', () => {
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const deployWorkflowPath = path.join(projectRoot, '.github/workflows/deploy.yml');
    const workflowsDir = path.join(projectRoot, '.github/workflows');
    const freezeDocPath = path.join(projectRoot, 'docs/hosted-jasper/deployment-freeze.md');
    const readmeDocPath = path.join(projectRoot, 'docs/hosted-jasper/README.md');
    const selfHostingDocPath = path.join(projectRoot, 'docs/hosted-jasper/self-hosting.md');
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    const dockerComposeQuickstartPath = path.join(projectRoot, 'docker-compose.quickstart.yml');
    const dockerfilePath = path.join(projectRoot, 'Dockerfile');
    const dockerignorePath = path.join(projectRoot, '.dockerignore');
    const entrypointScriptPath = path.join(projectRoot, 'scripts/docker-entrypoint.sh');
    const composeEnvPath = path.join(projectRoot, '.env.compose.example');
    const restoreScriptPath = path.join(projectRoot, 'scripts/restore.sh');
    const backupScriptPath = path.join(projectRoot, 'scripts/backup.sh');

    it('should have permanently removed the legacy deploy.yml workflow', () => {
        expect(fs.existsSync(deployWorkflowPath)).toBe(false);
    });

    it('should ensure no remaining GitHub workflows trigger unauthenticated PM2 or deploy branch deployments', () => {
        if (fs.existsSync(workflowsDir)) {
            const files = fs
                .readdirSync(workflowsDir)
                .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
            for (const file of files) {
                const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
                // Ensure no workflow runs PM2 deployments or SSH/SCP in-place host deployments
                expect(content).not.toMatch(/pm2\s+(?:startOrRestart|restart|start)/);
                expect(content).not.toMatch(/appleboy\/(?:ssh|scp)-action/);
            }
        }
    });

    it('should have comprehensive deployment retirement documentation referencing HJ-OSS-18 and Docker Compose', () => {
        expect(fs.existsSync(freezeDocPath)).toBe(true);
        const docContent = fs.readFileSync(freezeDocPath, 'utf8');

        expect(docContent).toMatch(/HJ-OSS-16/);
        expect(docContent).toMatch(/HJ-OSS-18/);
        expect(docContent).toMatch(/Permanently Retired/i);
        expect(docContent).toMatch(/docker-compose\.yml/);
        expect(docContent).toMatch(/docker-compose\.quickstart\.yml/);
        expect(docContent).toMatch(/pm2/i);
        expect(docContent).toMatch(/data\/jasper\.db/);
        expect(docContent).toMatch(/restore\.sh/);
        expect(docContent).toMatch(/backup\.sh/);
    });

    it('should document legacy deploy lane retirement in docs/hosted-jasper/README.md', () => {
        expect(fs.existsSync(readmeDocPath)).toBe(true);
        const readmeContent = fs.readFileSync(readmeDocPath, 'utf8');

        expect(readmeContent).toMatch(/HJ-OSS-18/);
        expect(readmeContent).toMatch(/docker-compose/i);
        expect(readmeContent).toMatch(/retired/i);
    });

    it('should ensure all replacement Docker Compose and disaster recovery artifacts exist', () => {
        expect(fs.existsSync(dockerComposePath)).toBe(true);
        expect(fs.existsSync(dockerComposeQuickstartPath)).toBe(true);
        expect(fs.existsSync(dockerfilePath)).toBe(true);
        expect(fs.existsSync(dockerignorePath)).toBe(true);
        expect(fs.existsSync(entrypointScriptPath)).toBe(true);
        expect(fs.existsSync(selfHostingDocPath)).toBe(true);
        expect(fs.existsSync(composeEnvPath)).toBe(true);
        expect(fs.existsSync(restoreScriptPath)).toBe(true);
        expect(fs.existsSync(backupScriptPath)).toBe(true);
    });
});
