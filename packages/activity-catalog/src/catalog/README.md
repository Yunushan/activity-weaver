# Activity catalog

Each JSON file in this directory is an independent, declarative adapter. The
catalog package generates a typed snapshot during build so the extension can
bundle the definitions without reading the filesystem at runtime.

Keep adapters public-page-only, small, and privacy-aware. See
docs/adapter-authoring.md and examples/custom-activity.json.
