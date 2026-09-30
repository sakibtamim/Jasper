import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Legacy Deploy Lane Freeze (HJ-OSS-16)', () => {
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const deployWorkflowPath = path.join(projectRoot, '.github/workflows/deploy.yml');
    const freezeDocPath = path.join(projectRoot, 'docs/hosted-jasper/deployment-freeze.md');
    const selfHostingDocPath = path.join(projectRoot, 'docs/hosted-jasper/self-hosting.md');
    const dockerComposePath = path.join(projectRoot, 'docker-compose.yml');
    const composeEnvPath = path.join(projectRoot, '.env.compose.example');
    const restoreScriptPath = path.join(projectRoot, 'scripts/restore.sh');
    const backupScriptPath = path.join(projectRoot, 'scripts/backup.sh');

    it('should have the legacy deploy.yml workflow present', () => {
        expect(fs.existsSync(deployWorkflowPath)).toBe(true);
    });

    it('should contain a prominent freeze and deprecation header referencing HJ-OSS-16', () => {
        const content = fs.readFileSync(deployWorkflowPath, 'utf8');

        // Verify deprecation notice headers
        expect(content).toMatch(/FREEZE NOTICE/i);
        expect(content).toMatch(/HJ-OSS-16/);
        expect(content).toMatch(/docker-compose\.yml/);
        expect(content).toMatch(/confirm_frozen_deploy/);
    });

    it('should have push triggers permanently disabled and require workflow_dispatch with confirm_frozen_deploy gate (Node-native)', () => {
        const content = fs.readFileSync(deployWorkflowPath, 'utf8');

        // Parse triggers under 'on:' without relying on external python or PyYAML
        const onBlockMatch = content.match(/\non:\s*\n([\s\S]*?)(?=\n[a-zA-Z0-9_-]+:|$)/);
        expect(onBlockMatch).toBeTruthy();
        const onBlock = onBlockMatch ? onBlockMatch[1] : '';

        // 1. Push and pull_request triggers must be absent from 'on:'
        expect(onBlock).not.toMatch(/^\s*push\s*:/m);
        expect(onBlock).not.toMatch(/^\s*pull_request\s*:/m);

        // 2. workflow_dispatch must be active
        expect(onBlock).toMatch(/^\s*workflow_dispatch\s*:/m);

        // 3. confirm_frozen_deploy boolean gate must be present and default to false
        expect(onBlock).toMatch(/confirm_frozen_deploy\s*:/);
        expect(onBlock).toMatch(/type:\s*boolean/);
        expect(onBlock).toMatch(/required:\s*true/);
        expect(onBlock).toMatch(/default:\s*false/);
    });

    it('should include validation steps rejecting execution when confirm_frozen_deploy is false', () => {
        const content = fs.readFileSync(deployWorkflowPath, 'utf8');

        // Check for gate checks in workflow steps
        expect(content).toMatch(/inputs\.confirm_frozen_deploy/);
        expect(content).toMatch(/Deployment rejected/i);
    });

    it('should have comprehensive deployment freeze documentation and rollback runbook', () => {
        expect(fs.existsSync(freezeDocPath)).toBe(true);
        const docContent = fs.readFileSync(freezeDocPath, 'utf8');

        expect(docContent).toMatch(/HJ-OSS-16/);
        expect(docContent).toMatch(/Rollback/i);
        expect(docContent).toMatch(/docker-compose\.yml/);
        expect(docContent).toMatch(/confirm_frozen_deploy/);
        expect(docContent).toMatch(/pm2/i);
    });

    it('should ensure all replacement stack and disaster recovery artifacts referenced in docs exist', () => {
        // Verifies targets referenced in deployment-freeze.md to guarantee no broken links or missing runbook tools
        expect(fs.existsSync(dockerComposePath)).toBe(true);
        expect(fs.existsSync(selfHostingDocPath)).toBe(true);
        expect(fs.existsSync(composeEnvPath)).toBe(true);
        expect(fs.existsSync(restoreScriptPath)).toBe(true);
        expect(fs.existsSync(backupScriptPath)).toBe(true);
    });
});
