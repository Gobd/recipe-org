#!/usr/bin/env bun
import plugin from 'bun-plugin-tailwind';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';

const buildAll = process.argv.includes('all');

const buildArgs = {
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  entrypoints: ['./src/index.tsx'],
  minify: true,
  plugins: [plugin],
  sourcemap: 'inline',
};

const buildConfigs = [
  {
    compile: {
      bytecode: true,
      outfile: './recipe_manager.exe',
      target: 'bun-windows-x64-modern',
      windows: {
        hideConsole: true,
      },
    },
    shouldBuild: process.argv.includes('windows') || buildAll,
  },
  {
    compile: {
      bytecode: true,
      outfile: './recipe_manager',
      target: 'bun-darwin-arm64-modern',
    },
    shouldBuild: process.argv.includes('mac') || buildAll,
  },
];

for (const buildConfig of buildConfigs) {
  if (existsSync(buildConfig.compile.outfile)) {
    console.log(`🗑️ Cleaning previous build at ${buildConfig.compile.outfile}`);
    await rm(buildConfig.compile.outfile, { force: true, recursive: true });
  }
}

const start = performance.now();

for (const config of buildConfigs) {
  if (!config.shouldBuild) {
    continue;
  }
  const result = await Bun.build({
    compile: config.compile,
    ...buildArgs,
  });
  result.success
    ? console.log(`✅ Built ${config.compile.outfile}`)
    : console.error(
        `❌ Failed to build ${config.compile.outfile} ${JSON.stringify(result.logs)}`,
      );
}

const end = performance.now();

const buildTime = (end - start).toFixed(2);
console.log(`\n✅ Build completed in ${buildTime}ms`);
