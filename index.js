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

					process.stdout.write(
						`About to install \x1b[1;31m${newDescriptors.length}\x1b[0m new packages.\nThis number includes the packages you are installing directly along with all their transitive dependencies.\n`,
					)

					// FIXME: Messy.
					const rl = readline.createInterface({
						input: process.stdin,
						output: process.stdout,
					})
					const ask = (q) => new Promise((resolve) => rl.question(q, resolve))
					const ans = await ask('Continue? (Y/Yes to continue, anything else to cancel)')
					rl.close()
					if (!['Y', 'Yes'].includes(ans)) throw new Error('User cancelled.')
				},
			},
		}
	},
}
