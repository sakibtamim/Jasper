import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

describe('Legacy Deploy Lane Freeze (HJ-OSS-16)', () => {
    const projectRoot = path.resolve(__dirname, '../../../../..');
    const deployWorkflowPath = path.join(projectRoot, '.github/workflows/deploy.yml');
    const freezeDocPath = path.join(projectRoot, 'docs/hosted-jasper/deployment-freeze.md');

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

    it('should have push triggers permanently disabled and require workflow_dispatch with confirm_frozen_deploy gate', () => {
        const pythonScript = `
import json, yaml
with open('${deployWorkflowPath}', 'r') as f:
    data = yaml.safe_load(f)

# PyYAML parses unquoted 'on' as boolean True
triggers = data.get('on') if 'on' in data else data.get(True, {})

print(json.dumps({
    'has_push': 'push' in triggers,
    'has_pull_request': 'pull_request' in triggers,
    'has_workflow_dispatch': 'workflow_dispatch' in triggers,
    'dispatch_inputs': triggers.get('workflow_dispatch', {}).get('inputs', {}),
    'jobs': list(data.get('jobs', {}).keys())
}))
`;
        const result = spawnSync('python3', ['-c', pythonScript], { encoding: 'utf8' });
        expect(result.status).toBe(0);

        const parsed = JSON.parse(result.stdout);

        // 1. Push triggers must be completely disabled
        expect(parsed.has_push).toBe(false);
        expect(parsed.has_pull_request).toBe(false);

        // 2. workflow_dispatch must be active
        expect(parsed.has_workflow_dispatch).toBe(true);

        // 3. confirm_frozen_deploy boolean gate must be present and default to false
        const confirmInput = parsed.dispatch_inputs.confirm_frozen_deploy;
        expect(confirmInput).toBeDefined();
        expect(confirmInput.type).toBe('boolean');
        expect(confirmInput.required).toBe(true);
        expect(confirmInput.default).toBe(false);
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
});
