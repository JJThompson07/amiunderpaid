/**
 * structure-lint — enforces this repo's naming & structure conventions (standalone).
 * Run via `pnpm lint:structure` (`tsx scripts/structure-lint.ts`). Exits non-zero on any violation.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';

const COMPONENT_PREFIX = 'AmI'; // Set based on CODE_STANDARDS.md for global components

type Violation = { rule: string; file: string; message: string };

const violations: Violation[] = [];
const fail = (rule: string, file: string, message: string): void => {
  violations.push({ rule, file, message });
};

const gitFiles = (): string[] =>
  execSync('git ls-files', { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

const under = (file: string, dir: string): boolean => file === dir || file.startsWith(`${dir}/`);
const underAny = (file: string, dirs: string[]): boolean => dirs.some((dir) => under(file, dir));

const isVue = (file: string): boolean => file.endsWith('.vue');
const isTs = (file: string): boolean => file.endsWith('.ts') && !file.endsWith('.d.ts');
const isSpec = (file: string): boolean => file.endsWith('.spec.ts');
const isPlay = (file: string): boolean => file.endsWith('.play.ts');

const pascal = (segment: string): string => segment.charAt(0).toUpperCase() + segment.slice(1);

const stem = (file: string): string => basename(file).replace(/\.(vue|ts)$/, '');

const TEST_EXEMPT_DIRS = ['server', 'app/plugins', 'app/middleware'];
const TEST_EXEMPT_FILES = ['app/app.vue', 'app/error.vue'];

const newFiles = new Set<string>();
try {
  // 1. Local Development (uncommitted/staged/untracked files)
  const headDiff = execSync('git diff --name-only --diff-filter=A HEAD', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  const cachedDiff = execSync('git diff --name-only --diff-filter=A --cached', {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  const untracked = execSync('git ls-files --others --exclude-standard', {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  // 2. CI/PR Environments (files committed in the branch vs main)
  let branchDiff = '';
  try {
    branchDiff = execSync('git diff --name-only --diff-filter=A origin/main...HEAD', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
  } catch {
    try {
      branchDiff = execSync('git diff --name-only --diff-filter=A main...HEAD', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
    } catch {
      // Ignore if main/origin/main doesn't exist or isn't fetched
    }
  }

  [
    ...headDiff.split('\n'),
    ...cachedDiff.split('\n'),
    ...untracked.split('\n'),
    ...branchDiff.split('\n')
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((f) => newFiles.add(f));
} catch (e) {
  // Gracefully handle general git errors (e.g. shallow clone, no HEAD)
}

for (const file of gitFiles()) {
  const base = basename(file);

  // Components
  if (under(file, 'app/components') && isVue(file)) {
    // Nuxt folder namespacing means a file might just be `Chip.vue` but becomes `<AmIChip>`
    if (!/^[A-Z][A-Za-z0-9]*\.vue$/.test(base)) {
      fail(
        'componentName',
        file,
        'component filename must be PascalCase (e.g. Button.vue or BaseButton.vue)'
      );
    }
  }

  // Composables
  if (under(file, 'app/composables') && isTs(file) && !isSpec(file)) {
    if (!/^use[A-Z]\w+\.ts$/.test(base)) {
      fail(
        'composableName',
        file,
        'composable must be named use<Name>.ts (e.g. useSessionUser.ts)'
      );
    }
  }

  // Layer casing (composables + utils are camelCase files)
  if (
    (under(file, 'app/composables') ||
      under(file, 'app/utils') ||
      under(file, 'utils') ||
      under(file, 'composables')) &&
    isTs(file) &&
    !isSpec(file)
  ) {
    if (!/^[a-z][A-Za-z0-9]*\.ts$/.test(base)) {
      fail('layerCasing', file, `${base} must be camelCase`);
    }
  }

  // Unit tests — sibling <name>.spec.ts must exist for eligible app source files
  // Note: amiunderpaid CODE_STANDARDS.md requires tests in adjacent `tests/` dir
  const eligibleForTest =
    (under(file, 'app/utils') ||
      under(file, 'app/composables') ||
      under(file, 'utils') ||
      under(file, 'composables')) &&
    isTs(file) &&
    !isSpec(file) &&
    !isPlay(file) &&
    !underAny(file, TEST_EXEMPT_DIRS) &&
    !TEST_EXEMPT_FILES.includes(file);

  if (eligibleForTest) {
    const spec = join(dirname(file), 'tests', `${stem(file)}.spec.ts`);
    if (!existsSync(spec)) {
      if (newFiles.has(file)) {
        fail('unitTests', file, 'missing adjacent unit test for newly added file');
      } else {
        // Temporarily write as a warning instead of failing the gate for pre-existing files
        process.stdout.write(`  ⚠ [unitTests] ${file} is missing an adjacent unit test (legacy)\n`);
      }
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(`\nstructure-lint: ${violations.length} violation(s):\n\n`);
  for (const v of violations) {
    process.stderr.write(`  ✗ [${v.rule}] ${v.file}\n      ${v.message}\n`);
  }
  process.exit(1);
}

process.stdout.write('structure-lint: all checks passed.\n');
