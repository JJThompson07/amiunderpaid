import fs from 'fs';
import path from 'path';

// Define the base directories for your locales
const LOCALES_DIR = path.join(process.cwd(), 'i18n/locales');
const REFERENCE_LOCALE = 'en-GB';
const TARGET_LOCALES = ['en-US']; // Add other locales here as you expand

/**
 * Recursively gets all keys from a JSON object
 */
function getAllKeys(obj: any, prefix = ''): string[] {
  return Object.keys(obj).reduce((res: string[], el) => {
    const name = prefix ? `${prefix}.${el}` : el;
    if (typeof obj[el] === 'object' && obj[el] !== null && !Array.isArray(obj[el])) {
      res.push(...getAllKeys(obj[el], name));
    } else {
      res.push(name);
    }
    return res;
  }, []);
}

function checkLocales() {
  const refPath = path.join(LOCALES_DIR, REFERENCE_LOCALE);

  // Get all JSON files in the reference directory
  const files = fs.readdirSync(refPath).filter((f) => f.endsWith('.json'));
  let hasErrors = false;

  files.forEach((file) => {
    const refContent = JSON.parse(fs.readFileSync(path.join(refPath, file), 'utf-8'));
    const refKeys = getAllKeys(refContent);

    TARGET_LOCALES.forEach((target) => {
      const targetFilePath = path.join(LOCALES_DIR, target, file);

      if (!fs.existsSync(targetFilePath)) {
        console.error(`❌ Missing File: ${target}/${file} does not exist.`);
        hasErrors = true;
        return;
      }

      const targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf-8'));
      const targetKeys = getAllKeys(targetContent);

      // Compare keys
      const missingInTarget = refKeys.filter((key) => !targetKeys.includes(key));
      const extraInTarget = targetKeys.filter((key) => !refKeys.includes(key));

      if (missingInTarget.length > 0) {
        console.error(`❌ ${target}/${file} is missing keys:`, missingInTarget);
        hasErrors = true;
      }
      if (extraInTarget.length > 0) {
        console.warn(
          `⚠️ ${target}/${file} has extra keys not in ${REFERENCE_LOCALE}:`,
          extraInTarget
        );
      }
    });
  });

  if (!hasErrors) {
    console.log('✅ All locale files are synchronized!');
  } else {
    process.exit(1);
  }
}

checkLocales();
