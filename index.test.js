const { describe, test } = require('node:test')
const assert = require('node:assert')
const { promises: fs } = require('node:fs')
const { exec, spawn } = require('node:child_process')
const path = require('node:path')

/*
 * `withTestPackage` sets up a temporary directory containing
 * a stub package that yarn can install and that also contains a copy of the
 * plugin source code.
 *
 * It facilitates writing tests that rely on the plugin and takes care
 * of cleaning up so that no cruft is left behind test runs.
 */
async function withTestPackage(testFunction) {
	const testDirectory = await fs.mkdtemp('test-')

	try {
		await fs.writeFile(path.join(testDirectory, 'package.json'), JSON.stringify({ packageManager: 'yarn@3.6.1' }))
		await fs.copyFile('index.js', path.join(testDirectory, 'index.js'))
		await fs.copyFile('.yarnrc.yml', path.join(testDirectory, '.yarnrc.yml'))
		await fs.writeFile(path.join(testDirectory, 'yarn.lock'), '')

		await exec('corepack enable', { cwd: testDirectory })
		await exec('yarn', { cwd: testDirectory })

		await testFunction({ cwd: testDirectory })
		await fs.rm(testDirectory, { recursive: true })
	} catch (e) {
		console.error(e)
		await fs.rm(testDirectory, { recursive: true })
		throw e
	}
}

/*
 * Runs `yarn add` with a test package and provides user input
 * to simulate usage scenarios.
 *
 * The process is returned.
 */
async function addYarnPackage({ input, cwd }) {
	const yarnAdd = spawn('yarn', ['add', 'ansicolor'], { cwd })

	yarnAdd.stdout.on('data', (data) => {
		// The user-driven prompt.
		if (String(data).includes('Continue?')) yarnAdd.stdin.write(`${input}\n`)
	})

	return new Promise((resolve) => {
		yarnAdd.on('exit', () => resolve(yarnAdd))
	})
}

describe('Yarn New Dependency Check', () => {
	test('Aborts installation if user opts to cancel', async () => {
		await withTestPackage(async ({ cwd }) => {
			const yarnAdd = await addYarnPackage({ input: 'no', cwd })

			assert.equal(yarnAdd.exitCode, 1)

			const updatedPackageJson = await fs.readFile(path.join(cwd, 'package.json'), { encoding: 'utf8' })
			const dependencies = JSON.parse(updatedPackageJson).dependencies
			assert.equal(dependencies, undefined)
		})
	})

	test('Proceeds with installation if user confirms with a valid input', async () => {
		await withTestPackage(async ({ cwd }) => {
			const yarnAdd = await addYarnPackage({ input: 'Yes', cwd })

			assert.equal(yarnAdd.exitCode, 0)

			const updatedPackageJson = await fs.readFile(path.join(cwd, 'package.json'), { encoding: 'utf8' })
			const dependencies = [...Object.keys(JSON.parse(updatedPackageJson).dependencies)]
			assert.equal(dependencies.length, 1)
		})
	})
})
