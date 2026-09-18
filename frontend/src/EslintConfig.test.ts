import { ESLint } from 'eslint';
import { expect, it } from 'vitest';

it('enforces frontend architecture rules', async () => {
  const eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfig: { languageOptions: { parserOptions: { project: false } } },
  });
  const [[result], [rawFetch], [crossFeature]] = await Promise.all([
    eslint.lintText(
      "const roleClass = { admin: 'dark:bg-[#123456]' }; export default roleClass;",
      { filePath: 'src/RoleClass.ts' },
    ),
    eslint.lintText('export const load = () => fetch("/api/core/test");', {
      filePath: 'src/Api/Legacy.ts',
    }),
    eslint.lintText(
      "import '@/Features/Changelog/Api'; export const fixture = true;",
      { filePath: 'src/Features/Admin/Api.ts' },
    ),
  ]);

  expect(
    result.messages.some(
      ({ ruleId, message }) =>
        ruleId === 'no-restricted-syntax' &&
        message.includes('Hardcoded hex colors'),
    ),
  ).toBe(true);
  expect(
    rawFetch.messages.some(({ ruleId }) => ruleId === 'no-restricted-globals'),
  ).toBe(true);
  expect(
    crossFeature.messages.some(
      ({ ruleId }) => ruleId === 'import/no-restricted-paths',
    ),
  ).toBe(true);
}, 15_000);
