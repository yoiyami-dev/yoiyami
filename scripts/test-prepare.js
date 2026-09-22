const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const configDir = path.join(root, '.config');
const configPath = path.join(configDir, 'test.yml');
const templatePath = path.join(root, '.github', 'misskey', 'test.yml');
const builtDir = path.join(root, 'built');
const metaPath = path.join(builtDir, 'meta.json');
const manifestDir = path.join(builtDir, '_client_dist_');
const manifestPath = path.join(manifestDir, 'manifest.json');
const packageJson = require(path.join(root, 'package.json'));
const productMeta = require(path.join(root, 'packages', 'meta.json'));

fs.mkdirSync(configDir, { recursive: true });

if (!fs.existsSync(configPath)) {
	fs.copyFileSync(templatePath, configPath);
	console.log(`created ${path.relative(root, configPath)}`);
}

fs.mkdirSync(builtDir, { recursive: true });

if (!fs.existsSync(metaPath)) {
	fs.writeFileSync(metaPath, JSON.stringify({
		...productMeta,
		buildVersion: packageJson.version,
	}), 'utf8');
	console.log(`created ${path.relative(root, metaPath)}`);
}

if (!fs.existsSync(manifestPath)) {
	fs.mkdirSync(manifestDir, { recursive: true });
	fs.writeFileSync(manifestPath, JSON.stringify({
		'src/init.ts': {
			file: 'app.js',
			css: [],
		},
	}), 'utf8');
	console.log(`created ${path.relative(root, manifestPath)}`);
}
