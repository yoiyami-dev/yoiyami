const execa = require('execa');

(async () => {
	console.log('installing dependencies of packages/backend ...');

	await execa('yarn', ['--frozen-lockfile', '--force', 'install'], {
		cwd: __dirname + '/../packages/backend',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	console.log('installing dependencies of packages/client ...');

	await execa('yarn', ['--frozen-lockfile', 'install'], {
		cwd: __dirname + '/../packages/client',
		stdout: process.stdout,
		stderr: process.stderr,
	});

	console.log('installing dependencies of packages/sw ...');

	await execa('yarn', ['--frozen-lockfile', 'install'], {
		cwd: __dirname + '/../packages/sw',
		stdout: process.stdout,
		stderr: process.stderr,
	});
})();
