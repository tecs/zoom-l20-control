import { run } from 'node:test';
import { spec } from 'node:test/reporters';

run({
  concurrency: true,
  coverage: true,
  coverageIncludeGlobs: ['{core,client,lib}/**/*.ts'],
  coverageExcludeGlobs: ['{client/testing,core/fixtures}/**', '**/*.test.ts'],
})
  .on('test:fail', () => {
    process.exitCode = 1;
  })
  .compose(spec)
  .pipe(process.stdout);
