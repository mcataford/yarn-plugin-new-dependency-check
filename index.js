function getPrompt(descriptorsLength) {
	const dependencyCount = process.env.NO_COLOR
		? `About to install ${descriptorsLength} new packages.\n`
		: `About to install \x1b[1;34m${descriptorsLength}\x1b[1;0m new packages.\n`

	const question = process.env.NO_COLOR
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

const CANCELLATION_MESSAGE = process.env.NO_COLOR
	? 'Action cancelled by user; no new packages installed.'
	: '\x1b[1;31mAction cancelled by user\x1b[1;0m; no new packages installed.'

module.exports = {
	name: 'plugin-new-dependency-check',
	factory: (require) => {
		const { ThrowReport } = require('@yarnpkg/core')
		const readline = require('readline')

		return {
			hooks: {
				async afterWorkspaceDependencyAddition(workspace, target, descriptor, strategies) {
					/*
					 * To determine how many additional packages will be installed, we compare
					 * the stored descriptors before and after resolving everything via `resolveEverything`.
					 *
					 * The difference of descriptor maps should reveal which have been added (which would be
					 * added packages).
					 */
					// FIXME: This won't necessarily be a good account of what's already installed.
					const currentDescriptors = workspace.project.storedDescriptors

					await workspace.project.resolveEverything({
						// FIXME: Will fail when used with unpublished tarballs.
						lockfileOnly: false,
						// TODO: Reporting boilerplate.
						report: new ThrowReport(),
					})

					const nextDescriptors = workspace.project.storedDescriptors

					const newDescriptors = []

					for (const [descriptorHash, descriptor] of nextDescriptors.entries()) {
						// The descriptor existed before.
						if (currentDescriptors.has(descriptorHash)) continue

						newDescriptors.push(descriptor.name)
					}

					const rl = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
					})

					const userInput = await new Promise((resolve) => rl.question(getPrompt(newDescriptors.length), resolve))

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
