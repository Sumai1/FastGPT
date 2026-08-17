import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { redactCustomerServiceSensitiveText } from '@fastgpt/global/core/customerService/privacy';

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const outputIndex = args.indexOf('--output-dir');
const outputDir = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
const files = args.filter(
  (item, index) =>
    item !== '--check' && item !== '--output-dir' && (outputIndex < 0 || index !== outputIndex + 1)
);
const workspaceRoot = resolve(__dirname, '../../..');

if (files.length === 0 || (!checkOnly && !outputDir)) {
  throw new Error(
    'Usage: pnpm exec tsx sanitize.ts --check <files...> OR --output-dir <dir> <files...>'
  );
}

/** 检查输入资料或向独立目录写出脱敏副本，绝不覆盖原文件。 */
const main = async () => {
  let sensitiveFileCount = 0;
  if (outputDir) await mkdir(resolve(workspaceRoot, outputDir), { recursive: true });

  for (const file of files) {
    const inputPath = resolve(workspaceRoot, file);
    const original = await readFile(inputPath, 'utf8');
    const sanitized = redactCustomerServiceSensitiveText(original);
    if (sanitized !== original) sensitiveFileCount += 1;

    if (outputDir) {
      const outputPath = resolve(workspaceRoot, outputDir, basename(inputPath));
      if (outputPath === inputPath) {
        throw new Error(`Refusing to overwrite input file: ${inputPath}`);
      }
      await writeFile(outputPath, sanitized, 'utf8');
    }
  }

  console.log(
    JSON.stringify({ checkedFiles: files.length, sensitiveFileCount, outputDir: outputDir || null })
  );
  if (checkOnly && sensitiveFileCount > 0) process.exitCode = 2;
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
