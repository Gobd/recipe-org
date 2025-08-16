#!/usr/bin/env bun
import plugin from 'bun-plugin-tailwind';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';
import path from 'path';

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const copyFiles = async (
  patterns: string[],
  srcDir: string,
  destDir: string,
): Promise<{ path: string; size: number }[]> => {
  const copiedFiles: { path: string; size: number }[] = [];

  for (const pattern of patterns) {
    const files = [...new Bun.Glob(pattern).scanSync(srcDir)];

    for (const file of files) {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      const destDirPath = path.dirname(destPath);

      // Ensure destination directory exists
      await Bun.write(path.join(destDirPath, '.keep'), '');
      await rm(path.join(destDirPath, '.keep'), { force: true });

      // Copy file
      const fileContent = Bun.file(srcPath);
      await Bun.write(destPath, fileContent);

      const stats = await fileContent.size;
      copiedFiles.push({ path: destPath, size: stats });
    }
  }

  return copiedFiles;
};

console.log('\n🚀 Starting build process...\n');

const outdir = path.join(process.cwd(), 'dist');

if (existsSync(outdir)) {
  console.log(`🗑️ Cleaning previous build at ${outdir}`);
  await rm(outdir, { force: true, recursive: true });
}

if (existsSync('./recipe_manager')) {
  console.log(`🗑️ Cleaning previous build at ./recipe_manager`);
  await rm('./recipe_manager', { force: true, recursive: true });
}

if (existsSync('./recipe_manager.exe')) {
  console.log(`🗑️ Cleaning previous build at ./recipe_manager.exe`);
  await rm('./recipe_manager.exe', { force: true, recursive: true });
}

const start = performance.now();

const entrypoints = [...new Bun.Glob('**.html').scanSync('src')]
  .map((a) => path.resolve('src', a))
  .filter((dir) => !dir.includes('node_modules'));
console.log(
  `📄 Found ${entrypoints.length} HTML ${entrypoints.length === 1 ? 'file' : 'files'} to process`,
);

const copiedFiles = await copyFiles(['**/*.tsx', '**/*.ts'], 'src', outdir);
console.log(`📋 Copied ${copiedFiles.length} additional files\n`);

const result = await Bun.build({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  entrypoints,
  minify: true,
  outdir,
  plugins: [plugin],
  sourcemap: 'linked',
  target: 'browser',
});

const end = performance.now();

const buildOutputs = result.outputs.map((output) => ({
  File: path.relative(process.cwd(), output.path),
  Size: formatFileSize(output.size),
  Type: output.kind,
}));

const copiedOutputs = copiedFiles.map((file) => ({
  File: path.relative(process.cwd(), file.path),
  Size: formatFileSize(file.size),
  Type: path.extname(file.path).slice(1).toUpperCase(),
}));

const allOutputs = [...buildOutputs, ...copiedOutputs];
console.table(allOutputs);

const buildTime = (end - start).toFixed(2);
console.log(`\n✅ Build completed in ${buildTime}ms`);
console.log(
  `📦 Total files: ${allOutputs.length} (${result.outputs.length} built + ${copiedFiles.length} copied)\n`,
);
