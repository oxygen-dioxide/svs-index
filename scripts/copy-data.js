import { promises as fs } from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const distDir = path.join(root, 'dist');
const dataSrc = path.join(root, 'data');
const dataDest = path.join(distDir, 'data');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  try {
    await copyDir(path.join(dataSrc, 'singers'), path.join(dataDest, 'singers'));
    await copyDir(path.join(dataSrc, 'softwares'), path.join(dataDest, 'softwares'));
    console.log('✅ Copied data into dist/data');
  } catch (err) {
    console.error('Failed to copy data into dist:', err);
    process.exitCode = 1;
  }
}

main();
