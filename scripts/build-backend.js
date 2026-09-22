const path = require('node:path');

const execa = require('execa');

const backendDirectory = path.resolve(__dirname, '../packages/backend');

const run = async (command, args) => execa(command, args, {
	cwd: backendDirectory,
	stdio: 'inherit',
	reject: false,
});

(async () => {
	const typeScript = await run('tsc', [
		'-p',
		'tsconfig.json',
		'--noEmitOnError',
		'false',
	]);

	if (typeScript.failed && typeScript.exitCode !== 2) {
		process.exit(typeScript.exitCode ?? 1);
	}

	if (typeScript.exitCode === 2) {
		console.warn('TypeScript reported diagnostics; continuing with emitted JavaScript.');
	}

	const aliases = await run('tsc-alias', ['-p', 'tsconfig.json']);
	if (aliases.failed) {
		process.exit(aliases.exitCode ?? 1);
	}
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
