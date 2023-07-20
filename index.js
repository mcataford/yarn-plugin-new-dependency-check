function isNoColourMode() {
	if (typeof process === 'undefined') return false

	return Boolean(process.env.NO_COLOR)
}

function getPrompt(packagesToInstall) {
	const dependencyCount = isNoColourMode()
		? `About to install ${packagesToInstall.length} new packages.\n`
		: `About to install \x1b[1;34m${packagesToInstall.length}\x1b[1;0m new packages.\n`

	const question = isNoColourMode()
		? 'Continue? (Y/Yes to continue, anything else to cancel): '
		: 'Continue? (\x1b[1;34mY/Yes to continue\x1b[1;0m, anything else to cancel): '

	const dependencyInfo =
		'The dependency count includes any package being installed as part of the dependency tree of the packages you are adding directly.'

	return `${'='.repeat(10)}
    ${dependencyCount}
    ${dependencyInfo}
    Packages: ${packagesToInstall.join(', ')}
${'='.repeat(10)}
${question}`
}

const CANCELLATION_MESSAGE = isNoColourMode()
	? 'Action cancelled by user; no new packages installed.'
	: '\x1b[1;31mAction cancelled by user\x1b[1;0m; no new packages installed.'

const RESOLVE_MESSAGE =
	'📦 Resolving direct and transitive dependencies being added...\nThis may take longer if the packages added have a lot of dependencies.'

const UNKNOWN_ERROR_MESSAGE =
	'🤔 Failed to match some dependencies while mapping new packages, results may be inaccurate.'

/*
 *  Collects new dependencies added by resolving the project based on the lockfile, then
 *  using the lockfile and the network, and comparing the two.
 *
 *  Returns a list containing the list of packages + versions added.
 *  This contains the direct and transitive dependencies touched by `yarn add`.
 *
 *  @param {Project} Yarn project.
 *  @param {Report} Report object from Yarn.
 */
async function determineNewDependencies(project, report) {
	await project.resolveEverything({
		// FIXME: Will fail when used with unpublished tarballs.
		lockfileOnly: true,
		// TODO: Reporting boilerplate.
		report,
	})

	const beforePackageLocators = new Set([...project.storedPackages.keys()])

	await project.resolveEverything({
		// FIXME: Will fail when used with unpublished tarballs.
		lockfileOnly: false,
		// TODO: Reporting boilerplate.
		report,
	})

	return [...project.storedPackages.entries()]
		.filter(([key]) => {
			return !beforePackageLocators.has(key)
		})
		.map(([, packageData]) => {
			return `${packageData.name}@${packageData.version}`
		})
}

module.exports = {
	name: 'plugin-new-dependency-check',
	factory: (require) => {
		const { ThrowReport } = require('@yarnpkg/core')
		const readline = require('readline')

		let addedPackages

		return {
			hooks: {
				/*
				 * afterWorkspaceDependencyAddition?: (
				 *  workspace: Workspace,
				 *  target: suggestUtils.Target,
				 *  descriptor: Descriptor,
				 *  strategies: Array<suggestUtils.Strategy>
				 * )() => Promise<void>
				 *
				 * See hook documentation: https://yarnpkg.com/advanced/plugin-tutorial#hook-afterWorkspaceDependencyAddition
				 */
				async afterWorkspaceDependencyAddition(workspace, target, descriptor, strategies) {
					if (addedPackages) return

					process.stdout.write(`${RESOLVE_MESSAGE}\n`)

					addedPackages = await determineNewDependencies(workspace.project, new ThrowReport())

					const rl = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
					})

					const userInput = await new Promise((resolve) => rl.question(getPrompt(addedPackages), resolve))

					rl.close()

					if (!['Y', 'Yes'].includes(userInput)) {
						process.stdout.write(`${CANCELLATION_MESSAGE}\n`)
						process.exit(1)
					}
				},
			},
		}
	},
}
