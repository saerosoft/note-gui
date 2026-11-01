PNPM ?= pnpm
PYTHON ?= python3

.PHONY: bootstrap start-all build test import-check verify

bootstrap:
	@$(PNPM) install --frozen-lockfile

start-all:
	@$(PNPM) dev

build:
	@$(PNPM) build

test:
	@$(PYTHON) scripts/test_source_offer.py
	@$(PNPM) test

import-check: build
	@$(PNPM) test:package

verify: test import-check
