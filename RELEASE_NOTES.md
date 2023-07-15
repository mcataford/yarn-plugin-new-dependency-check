# Release notes

## v0.0.2 (15/7/2023)

Addresses an issue whereas a top-level use of `process` to check for whether colours have been disabled in the terminal
crashes the call to `yarn plugin import`.

## v0.0.1 (15/7/2023)

Initial release.

- Adds the basic functionality (counts added dependencies, provides prompt for user to confirm).
- Adds basic documentation about the project.

To get started, `yarn plugin import <release link>` can be used. No special commands need to be used, this adds a
pre-fetch step to `yarn add`.
