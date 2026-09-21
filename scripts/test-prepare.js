const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const configDir = path.join(root, '.config');
const configPath = path.join(configDir, 'test.yml');
const templatePath = path.join(root, '.github', 'misskey', 'test.yml');

fs.mkdirSync(configDir, { recursive: true });

if (!fs.existsSync(configPath)) {
	fs.copyFileSync(templatePath, configPath);
	console.log(`created ${path.relative(root, configPath)}`);
}
