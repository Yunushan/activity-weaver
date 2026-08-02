# Tests

The unit tests use Node.js' built-in test runner and execute against the
compiled workspace packages. Run `pnpm build` before invoking
`pnpm test:unit` directly; `pnpm test` is the normal entry point and includes
the package smoke tests plus these tests.
