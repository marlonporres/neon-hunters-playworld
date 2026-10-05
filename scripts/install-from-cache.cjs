// Offline recovery for this machine. Normal setup remains `npm install`.
// Reads official npm tarballs from an existing cache; writes only inside this repo.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const npmModules = 'C:/Program Files/nodejs/node_modules/npm/node_modules';
const cacache = require(`${npmModules}/cacache`);
const tar = require(`${npmModules}/tar`);
const semver = require(`${npmModules}/semver`);
const cache = 'C:/Users/marlo/AppData/Local/npm-cache/_cacache';
const root = process.cwd();

(async () => {
  const entries = await cacache.ls(cache);
  const candidates = new Map();
  for (const key of Object.keys(entries)) {
    const match = key.match(/request-cache:(https:\/\/registry\.npmjs\.org\/(.+)\/-\/[^/]+-(\d+\.\d+\.\d+(?:-[^/]+)?)\.tgz)$/);
    if (!match) continue;
    const name = decodeURIComponent(match[2]);
    if (!candidates.has(name)) candidates.set(name, []);
    candidates.get(name).push({ key, url: match[1], version: match[3] });
  }
  const manifest = JSON.parse(await fs.readFile('package.json', 'utf8'));
  const lock = { name: manifest.name, version: manifest.version, lockfileVersion: 3, requires: true, packages: { '': { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies, devDependencies: manifest.devDependencies } } };
  const installed = new Map();
  async function install(name, range, parent = '', optional = false, dev = false) {
    const existing = installed.get(name);
    if (existing && semver.satisfies(existing.version, range)) return;
    const choices = (candidates.get(name) || []).filter((candidate) => semver.satisfies(candidate.version, range)).sort((a, b) => semver.rcompare(a.version, b.version));
    if (!choices.length) {
      if (optional) return;
      throw new Error(`Required npm tarball missing from cache: ${name}@${range}`);
    }
    const selected = choices[0];
    const relative = existing ? `${parent}/node_modules/${name}` : `node_modules/${name}`;
    const directory = path.resolve(root, relative);
    if (!directory.startsWith(root + path.sep)) throw new Error('Invalid dependency destination');
    const cached = await cacache.get(cache, selected.key);
    // Inspect package metadata before installing platform-specific optional dependencies.
    let pkg;
    await new Promise((resolve, reject) => {
      const parser = tar.t({ onReadEntry: (entry) => {
        if (!/^[^/]+\/package\.json$/.test(entry.path)) return;
        let content = '';
        entry.on('data', (chunk) => { content += chunk; });
        entry.on('end', () => { pkg = JSON.parse(content); });
      } });
      parser.on('error', reject).on('end', resolve);
      parser.end(cached.data);
    });
    if (pkg.os && !pkg.os.includes(process.platform)) return;
    if (pkg.cpu && !pkg.cpu.includes(process.arch)) return;
    await fs.mkdir(directory, { recursive: true });
    await new Promise((resolve, reject) => {
      const extractor = tar.x({ cwd: directory, strip: 1 });
      extractor.on('error', reject).on('finish', resolve);
      extractor.end(cached.data);
    });
    if (!existing) installed.set(name, pkg);
    lock.packages[relative.replaceAll('\\', '/')] = {
      version: pkg.version, resolved: selected.url,
      integrity: 'sha512-' + crypto.createHash('sha512').update(cached.data).digest('base64'),
      ...(dev ? { dev: true } : {}),
      ...(optional ? { optional: true } : {}),
      ...(pkg.dependencies ? { dependencies: pkg.dependencies } : {}),
      ...(pkg.optionalDependencies ? { optionalDependencies: pkg.optionalDependencies } : {}),
      ...(pkg.bin ? { bin: pkg.bin } : {}),
      ...(pkg.engines ? { engines: pkg.engines } : {}),
    };
    for (const [dep, version] of Object.entries(pkg.dependencies || {})) {
      await install(dep, version, relative, Boolean(pkg.optionalDependencies?.[dep]), dev);
    }
    for (const [dep, version] of Object.entries(pkg.optionalDependencies || {})) await install(dep, version, relative, true, dev);
    console.log(`Installed ${name}@${pkg.version}`);
  }
  for (const [name, version] of Object.entries(manifest.dependencies)) await install(name, version);
  for (const [name, version] of Object.entries(manifest.devDependencies)) await install(name, version, '', false, true);
  await fs.writeFile('package-lock.json', JSON.stringify(lock, null, 2) + '\n');
  // Native npm creates the executable shims without needing registry access now.
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
