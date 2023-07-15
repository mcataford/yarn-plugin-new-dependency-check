function getDependencyCountMessage(descriptorsLength) {
	return process.env.NO_COLOR
		? `About to install ${descriptorsLength} new packages.\n`
		: `About to install \x1b[1;34m${descriptorsLength}\x1b[1;0m new packages.\n`
}

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

					process.stdout.write(getDependencyCountMessage(newDescriptors.length))

					// FIXME: Messy.
					const rl = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
					})
					const ask = (q) => new Promise((resolve) => rl.question(q, resolve))
					const ans = await ask('Continue? (Y/Yes to continue, anything else to cancel)s')
					rl.close()
					if (!['Y', 'Yes'].includes(ans)) {
						process.stdout.write('Cancelled!\n')
						process.exit(1)
					}
				},
			},
		}
	},
}
