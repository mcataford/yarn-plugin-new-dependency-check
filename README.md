# yarn-plugin-new-dependency-check
📦 Never accidentally pull in a billion new dependencies again.

> # ✈️ Moved away!
>
> This project has moved away from Github and is now hosted [elsewhere](https://forge.karnov.club/marc/yarn-plugin-new-dependency-check).

## Thoughts

One of the things I've come to love about how Linux prompts users when installing dependencies is that it makes it
explicit how many packages will be fetched.

```bash
λ sudo apt install cowsay
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
Suggested packages:
  filters cowsay-off
The following NEW packages will be installed:
  cowsay
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
```

When compared to the NodeJS ecosystem, this is vastly superior in that you can't really unknowning depend on a million
things without having been explicitly notified about how many additional packages you were adding to your dependency
tree along the way.

With this lack of awareness as well as how much NodeJS relies on adopting third-party packages, it's no wonder
dependency hell is a thing.

__This plugin attacks this problem from the angle of awareness -- by surfacing what's being installed (including
transitive dependencies), you can make informed decisions about whether a certain package is worth it or not.__

## Disclaimer

Until this is released as `1.x`, consider every release as potentially-breaking. Consult the release notes for more
details.

## Installation

```sh
yarn plugin import <link to your chosen release>
```

## Development & Contributing

Work done on this plugin follows decisions and principles documented [here](./DECISIONS.md).

Feel free to open a PR or an issue if you'd like to submit improvements! Anything sent up will be processed as soon as possible.
