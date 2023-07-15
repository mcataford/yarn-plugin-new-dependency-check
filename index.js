function isNoColourMode() {
	if (typeof process === 'undefined') return false

	return Boolean(process.env.NO_COLOR)
}

function getPrompt(descriptorsLength) {
	const dependencyCount = isNoColourMode()
		? `About to install ${descriptorsLength} new packages.\n`
		: `About to install \x1b[1;34m${descriptorsLength}\x1b[1;0m new packages.\n`

	const question = isNoColourMode()
		? 'Continue? (Y/Yes to continue, anything else to cancel): '
		: 'Continue? (\x1b[1;34mY/Yes to continue\x1b[1;0m, anything else to cancel): '

	const dependencyInfo =
		'The dependency count includes any package being installed as part of the dependency tree of the packages you are adding directly.'

	return `${'='.repeat(10)}
    ${dependencyCount}
    ${dependencyInfo}
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
 *  Builds a collection of new dependencies based on resolved packages and known added
 *  package names.
 *
 *  Returns a single collection containing the flattened dependency subtrees rooted
 *  at each of the added packages. This contains the direct and transitive dependencies
 *  touched by `yarn add`.
 *
 *  @param {Map<LocatorHash, Locator>} storedPackages Stored Package map from the Yarn Project.
 *  @param {Map<DescriptorHash, Descriptor>} packageDescriptors Stored descriptors map from the Yarn Project.
 *  @param {Array<string>} addedIdentHashes Top-level package identity hashes being added.
 */
function determineNewDependencies(storedPackages, packageDescriptors, addedIdentHashes) {
	const packagesByIdentHash = new Map()

	for (const storedPackage of storedPackages.values()) {
		packagesByIdentHash.set(storedPackage.identHash, storedPackage)
	}

	const addedPackagesMap = new Map()

	const identHashStack = [...addedIdentHashes]

	while (identHashStack.length > 0) {
		const addedHash = identHashStack.pop()
		const addedPackage = packagesByIdentHash.get(addedHash)

		if (!addedPackage) {
			process.stdout.write(`${UNKNOWN_ERROR_MESSAGE}\n`)
			continue
		}

		// Multiple packages may depend on the same package. We only
		// track it once.
		if (!addedPackagesMap.has(addedHash)) {
			addedPackagesMap.set(addedHash, addedPackage)
			identHashStack.push(...addedPackage.dependencies.keys())
		}
	}

	return addedPackagesMap
}

module.exports = {
	name: 'plugin-new-dependency-check',
	factory: (require) => {
		const { ThrowReport } = require('@yarnpkg/core')
		const readline = require('readline')

		const state = {
			addedTopLevelPackages: undefined,
			addedIdentHashes: new Set(),
		}

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
					/*
					 * This hook is executed for each added dependency such that
					 * `yarn add A B C` will call it thrice. To avoid this, we can
					 * parse the command-line arguments to determine what the user is
					 * trying to add.
					 *
					 * Because the hook is run multiple times, we cache the result of the
					 * arg analysis to avoid redoing it each time.
					 */
					state.addedTopLevelPackages =
						state.addedTopLevelPackages ||
						process.argv.filter((arg, position) => {
							// The first three arguments are the node and yarn runtime paths, and
							// the add command.
							if (position < 3) return false

							// Flags passed to `yarn add` are ignored.
							if (arg.startsWith('-')) return false

							return true
						})

					// Keeping track of descriptor hashes added directly speeds up the work
					// of building the dependency trees later.
					state.addedIdentHashes.add(descriptor.identHash)

					// To run this logic once, we wait until the last item is being processed.
					if (state.addedTopLevelPackages[state.addedTopLevelPackages.length - 1] !== descriptor.name) {
						return
					}

					process.stdout.write(`${RESOLVE_MESSAGE}\n`)

					await workspace.project.resolveEverything({
						// FIXME: Will fail when used with unpublished tarballs.
						lockfileOnly: false,
						// TODO: Reporting boilerplate.
						report: new ThrowReport(),
					})

					const newDependencies = determineNewDependencies(
						workspace.project.storedPackages,
						workspace.project.storedDescriptors,
						state.addedIdentHashes,
					)

					const rl = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
					})

					const userInput = await new Promise((resolve) => rl.question(getPrompt(newDependencies.size), resolve))

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
