# Decisions

This decision log tracks the broad principles that guide the project.

## Typescript is nice, but not here.

Typescript is a great asset for development, but the aim of this is to stay small enough that it won't be warranted. Not
having Typescript also shaves off the need for a build step that generates more artifacts.

## As few dependencies as possible, even development ones

In the spirit of keeping things small and not falling for the dependency trap the package tries to discourage, only the bare minimum of dependencies are admitted.

- No production dependencies;
- Absolute necessities in development dependencies only (i.e. a linter+formatter is handy, but not much else).

## Single-purpose

There is no desire or plans to extend this plugin beyond its initial scope at this time. Do one thing, do it well.
