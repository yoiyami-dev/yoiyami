const fs = require('fs');
const execa = require('execa');

const backendEntry = __dirname + '/../packages/backend/built/index.js';
const backendBuild = __dirname + '/../packages/backend/built';
let backendReady = false;

const hasUnresolvedAliases = dir => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const file = `${dir}/${entry.name}`;

		if (entry.isDirectory() && hasUnresolvedAliases(file)) return true;
		if (!entry.isFile() || !entry.name.endsWith('.js')) continue;

		try {
			if (/\b(?:from|import|require)\s*(?:\(\s*)?["']@\//.test(fs.readFileSync(file, 'utf8'))) return true;
		} catch {
			return true;
		}
	}

	return false;
};

const waitForBackendBuild = async () => {
	if (backendReady) return;

	while (!fs.existsSync(backendEntry) || hasUnresolvedAliases(backendBuild)) {
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	backendReady = true;
};

(async () => {
	await execa('pnpm', ['run', 'clean'], {
		cwd: __dirname + '/../',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	execa('pnpm', ['exec', 'gulp', 'watch'], {
		cwd: __dirname + '/../',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	execa('pnpm', ['run', 'watch'], {
		cwd: __dirname + '/../packages/backend',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	execa('pnpm', ['run', 'watch'], {
		cwd: __dirname + '/../packages/client',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	execa('pnpm', ['run', 'watch'], {
		cwd: __dirname + '/../packages/sw',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	const start = async () => {
		try {
			await waitForBackendBuild();
			await execa('pnpm', ['run', 'start'], {
				cwd: __dirname + '/../',
				stdout: process.stdout,
				stderr: process.stderr,
			});
		} catch (e) {
			await new Promise(resolve => setTimeout(resolve, 3000));
			start();
		}
	};

	start();
})();
