#!/usr/bin/env bun
import plugin from 'bun-plugin-tailwind';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';

const buildArtifacts = ['./recipe_manager', './recipe_manager.exe'];

for (const artifact of buildArtifacts) {
  if (existsSync(artifact)) {
    console.log(`🗑️ Cleaning previous build at ${artifact}`);
    await rm(artifact, { force: true, recursive: true });
  }
}

const buildAll = process.argv.includes('all');
const buildMac = process.argv.includes('mac') || buildAll;
const buildWindows = process.argv.includes('windows') || buildAll;

const buildArgs = {
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  entrypoints: ['./src/index.tsx'],
  minify: true,
  plugins: [plugin],
  sourcemap: 'inline',
};

const start = performance.now();

if (buildWindows) {
  await Bun.build({
    compile: {
      bytecode: true,
      outfile: './recipe_manager.exe',
      target: 'bun-windows-x64-modern',
      windows: {
        hideConsole: true,
      },
    },
    ...buildArgs,
  });
}

if (buildMac) {
  await Bun.build({
    compile: {
      bytecode: true,
      outfile: './recipe_manager',
      target: 'bun-darwin-arm64-modern',
    },
    ...buildArgs,
  });
}

const end = performance.now();

const buildTime = (end - start).toFixed(2);
console.log(`\n✅ Build completed in ${buildTime}ms`);
console.log(`\n✅ Build completed in ${buildTime}ms`);
