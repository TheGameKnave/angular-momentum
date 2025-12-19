import type { Reporter, TestCase, TestResult, TestStep, FullResult, Suite } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

interface FlowAction {
  action: string;
  selector?: string;
  value?: string;
  url?: string;
}

interface TestFlow {
  title: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  duration: number;
  actions: FlowAction[];
}

interface FlowSummary {
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  flows: TestFlow[];
}

/**
 * Custom Playwright reporter that generates human-readable user flow summaries.
 *
 * Outputs a plain-text report showing the sequence of user actions for each test,
 * making it easy to understand what paths the e2e tests exercised.
 *
 * Example output:
 *   ✓ Login with email succeeds (2.3s)
 *     → Navigate to http://localhost:4200
 *     → Click [data-testid="auth-menu-button"]
 *     → Click [data-testid="login-tab"]
 *     → Fill [data-testid="login-identifier"] with "test@example.com"
 *     → Fill [data-testid="login-password"] with "***"
 *     → Click [data-testid="login-submit"]
 */
class FlowReporter implements Reporter {
  private flows: TestFlow[] = [];
  private testFlows = new Map<string, TestFlow>(); // Track by test ID for parallel safety
  private outputDir: string;

  constructor(options: { outputDir?: string } = {}) {
    this.outputDir = options.outputDir || './playwright-report';
  }

  private getTestId(test: TestCase): string {
    return `${test.location.file}:${test.location.line}:${test.title}`;
  }

  onTestBegin(test: TestCase): void {
    const testId = this.getTestId(test);
    this.testFlows.set(testId, {
      title: test.title,
      file: path.basename(test.location.file),
      status: 'passed',
      duration: 0,
      actions: [],
    });
  }

  onStepEnd(test: TestCase, result: TestResult, step: TestStep): void {
    const testId = this.getTestId(test);
    const flow = this.testFlows.get(testId);
    if (!flow) return;

    // Only process pw:api steps (actual Playwright commands) and test.step annotations
    if (step.category !== 'pw:api' && step.category !== 'test.step') return;

    const action = this.parseStepToAction(step);
    if (action) {
      flow.actions.push(action);
    }
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testId = this.getTestId(test);
    const flow = this.testFlows.get(testId);
    if (!flow) return;

    flow.status = result.status;
    flow.duration = result.duration;
    this.flows.push(flow);
    this.testFlows.delete(testId);
  }

  async onEnd(result: FullResult): Promise<void> {
    const summary = this.buildSummary(result);
    // Only print to terminal if all tests passed; always write to file
    const printToTerminal = result.status === 'passed';
    await this.writeTextReport(summary, printToTerminal);
    await this.writeJsonReport(summary);
  }

  private parseStepToAction(step: TestStep): FlowAction | null {
    const title = step.title;
    const category = step.category;

    // Skip internal actions
    if (title.startsWith('Wait for') || title.startsWith('Launch') ||
        title.startsWith('Create context') || title.startsWith('Create page') ||
        title.startsWith('Close context')) {
      return null;
    }

    // Navigate to "url" format
    if (title.startsWith('Navigate to')) {
      const match = title.match(/Navigate to ["'](.+?)["']/);
      return { action: 'Navigate to', url: match?.[1] || '/' };
    }

    // Click locator('selector') format
    if (title.startsWith('Click')) {
      const selector = this.extractSelector(title);
      return { action: 'Click', selector };
    }

    // Fill locator('selector') with "value" format
    if (title.startsWith('Fill')) {
      const selector = this.extractSelector(title);
      // Try to extract the value after "with"
      const valueMatch = title.match(/with ["'](.+?)["']/);
      const value = valueMatch?.[1];
      const maskedValue = this.maskSensitiveValue(selector, value);
      return { action: 'Fill', selector, value: maskedValue };
    }

    // Type format
    if (title.startsWith('Type')) {
      const selector = this.extractSelector(title);
      const valueMatch = title.match(/["']([^"']+)["']\s*$/);
      const value = valueMatch?.[1];
      const maskedValue = this.maskSensitiveValue(selector, value);
      return { action: 'Type', selector, value: maskedValue };
    }

    // Press key
    if (title.startsWith('Press')) {
      const keyMatch = title.match(/Press ["'](.+?)["']/);
      return { action: 'Press key', value: keyMatch?.[1] };
    }

    // Select option
    if (title.startsWith('Select')) {
      const selector = this.extractSelector(title);
      const valueMatch = title.match(/option ["'](.+?)["']/);
      return { action: 'Select', selector, value: valueMatch?.[1] };
    }

    // Check/Uncheck
    if (title.startsWith('Check')) {
      return { action: 'Check', selector: this.extractSelector(title) };
    }
    if (title.startsWith('Uncheck')) {
      return { action: 'Uncheck', selector: this.extractSelector(title) };
    }

    // Hover
    if (title.startsWith('Hover')) {
      return { action: 'Hover', selector: this.extractSelector(title) };
    }

    // For test.step annotations, use the title directly as a named step
    if (category === 'test.step') {
      return { action: title };
    }

    return null;
  }

  private extractSelector(title: string): string {
    // Try to extract selector from locator('...') format
    // Handle nested quotes and :has-text() patterns like:
    // locator('app-cookie-banner p-button:has-text("Accept")')
    // Use greedy match (.+) to capture up to the last quote+paren
    const locatorMatch = title.match(/locator\(['"](.+)['"]\)/);
    if (locatorMatch) return locatorMatch[1];

    // Try locator(...) without quotes (for complex expressions)
    const complexMatch = title.match(/locator\(([^)]+)\)/);
    if (complexMatch) return complexMatch[1].replace(/['"]/g, '');

    // getBy* patterns
    const getByMatch = title.match(/getBy\w+\(['"](.+?)['"]\)/);
    if (getByMatch) return `[${getByMatch[1]}]`;

    return '(selector)';
  }

  private maskSensitiveValue(selector?: string, value?: string): string {
    if (!value) return '***';

    // Mask passwords
    if (selector?.toLowerCase().includes('password')) {
      return '***';
    }

    // Mask emails partially
    if (selector?.toLowerCase().includes('email') || selector?.toLowerCase().includes('identifier')) {
      if (value.includes('@')) {
        const [local, domain] = value.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
      }
    }

    // Mask credit card numbers
    if (selector?.toLowerCase().includes('card') || selector?.toLowerCase().includes('credit')) {
      return value.replace(/\d(?=\d{4})/g, '*');
    }

    return value;
  }

  private buildSummary(result: FullResult): FlowSummary {
    const passed = this.flows.filter(f => f.status === 'passed').length;
    const failed = this.flows.filter(f => f.status === 'failed').length;
    const skipped = this.flows.filter(f => f.status === 'skipped').length;

    return {
      timestamp: new Date().toISOString(),
      totalTests: this.flows.length,
      passed,
      failed,
      skipped,
      flows: this.flows,
    };
  }

  private async writeTextReport(summary: FlowSummary, printToTerminal: boolean): Promise<void> {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════════════════════');
    lines.push('                           E2E USER FLOW SUMMARY');
    lines.push('═══════════════════════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Generated: ${new Date(summary.timestamp).toLocaleString()}`);
    lines.push(`Total: ${summary.totalTests} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`);
    lines.push('');

    // Group flows by file
    const byFile = new Map<string, TestFlow[]>();
    for (const flow of summary.flows) {
      const existing = byFile.get(flow.file) || [];
      existing.push(flow);
      byFile.set(flow.file, existing);
    }

    for (const [file, flows] of byFile) {
      lines.push('───────────────────────────────────────────────────────────────────────────────');
      lines.push(`📁 ${file}`);
      lines.push('───────────────────────────────────────────────────────────────────────────────');
      lines.push('');

      for (const flow of flows) {
        const statusIcon = flow.status === 'passed' ? '✓' : flow.status === 'failed' ? '✗' : '○';
        const duration = (flow.duration / 1000).toFixed(1);
        lines.push(`  ${statusIcon} ${flow.title} (${duration}s)`);

        if (flow.actions.length === 0) {
          lines.push('    (no user actions recorded)');
        } else {
          for (const action of flow.actions) {
            lines.push(`    → ${this.formatAction(action)}`);
          }
        }
        lines.push('');
      }
    }

    lines.push('═══════════════════════════════════════════════════════════════════════════════');

    const report = lines.join('\n');

    // Always write to file
    const outputPath = path.join(this.outputDir, 'user-flows.txt');
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(outputPath, report);

    // Only print to terminal if all tests passed
    if (printToTerminal) {
      console.log('\n' + report);
    }
  }

  private async writeJsonReport(summary: FlowSummary): Promise<void> {
    const outputPath = path.join(this.outputDir, 'user-flows.json');
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
  }

  private formatAction(action: FlowAction): string {
    if (action.url) {
      return `${action.action} ${action.url}`;
    }
    if (action.value && action.selector) {
      return `${action.action} ${action.selector} with "${action.value}"`;
    }
    if (action.selector) {
      return `${action.action} ${action.selector}`;
    }
    return action.action;
  }
}

export default FlowReporter;
