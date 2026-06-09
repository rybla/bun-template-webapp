[doc("Install all dependencies")]
install:
  @echo "Installing dependencies"
  bun install

[doc("Format source code (prettier)")]
format:
  @echo "Formatting"
  bun prettier --log-level warn --write .

[doc("Typecheck source code (tsc)")]
typecheck:
  @echo "Typechecking"
  bun tsc --noEmit

[doc("Lint source code (eslint)")]
lint:
  @echo "Linting"
  bun eslint . --fix

[doc("Validate dependencies (depcruice)")]
depcruise:
  @echo "Validating dependencies"
  bun depcruise src

[doc("Run test suite")]
test:
  @echo "Running test suite"
  bun test

[doc("Bundle project (vite)")]
bundle:
  @echo "Bundling project"
  bun vite build

[doc("Run entire build pipeline")]
build: install format typecheck lint depcruise test bundle

[doc("Run local development server")]
dev: build
  @echo "Running local development server"
  bun vite

[doc("Deploy to GitHub Pages")]
deploy: build
  ./deploy-to-github-pages.sh
