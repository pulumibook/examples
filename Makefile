ensure:
	npm install -g npm-check-updates

test: ensure
	./scripts/test.sh
