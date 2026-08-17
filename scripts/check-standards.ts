import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Violation = { rule: string; file: string; message: string };
const violations: Violation[] = [];

const fail = (rule: string, file: string, message: string): void => {
  violations.push({ rule, file, message });
};

try {
  // 1. Read package.json
  const pkgPath = join(process.cwd(), 'package.json');
  const pkgContent = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgContent);

  const nuxtVersion = pkg.dependencies?.nuxt?.match(/\d+/)?.[0] || 'Unknown';
  const tailwindVersion = pkg.devDependencies?.tailwindcss?.match(/\d+/)?.[0] || 'Unknown';

  // 2. Read CODE_STANDARDS.md
  const codeStandardsPath = join(process.cwd(), 'CODE_STANDARDS.md');
  const codeStandards = readFileSync(codeStandardsPath, 'utf8');

  // Check CODE_STANDARDS.md for Nuxt version
  if (!codeStandards.includes(`Nuxt ${nuxtVersion}`)) {
    fail(
      'documentationSync',
      'CODE_STANDARDS.md',
      `Expected CODE_STANDARDS.md to mention Nuxt ${nuxtVersion} matching package.json, but it does not.`
    );
  }

  // Check CODE_STANDARDS.md for Tailwind version
  if (!codeStandards.includes(`Tailwind CSS v${tailwindVersion}`)) {
    fail(
      'documentationSync',
      'CODE_STANDARDS.md',
      `Expected CODE_STANDARDS.md to mention Tailwind CSS v${tailwindVersion} matching package.json, but it does not.`
    );
  }

  // 3. Read AGENTS.md
  const agentsPath = join(process.cwd(), 'AGENTS.md');
  const agents = readFileSync(agentsPath, 'utf8');

  if (!agents.includes(`Nuxt ${nuxtVersion}`)) {
    fail(
      'documentationSync',
      'AGENTS.md',
      `Expected AGENTS.md to mention Nuxt ${nuxtVersion} matching package.json, but it does not.`
    );
  }

  if (!agents.includes(`Tailwind CSS v${tailwindVersion}`)) {
    fail(
      'documentationSync',
      'AGENTS.md',
      `Expected AGENTS.md to mention Tailwind CSS v${tailwindVersion} matching package.json, but it does not.`
    );
  }

} catch (error) {
  console.error('Error running check-standards:', error);
  process.exit(1);
}

if (violations.length > 0) {
  process.stderr.write(`\ncheck-standards: ${violations.length} violation(s):\n\n`);
  for (const v of violations) {
    process.stderr.write(`  ✗ [${v.rule}] ${v.file}\n      ${v.message}\n`);
  }
  process.exit(1);
}

process.stdout.write('check-standards: all checks passed.\n');
