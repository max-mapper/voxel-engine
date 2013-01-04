all: concat
 
concat:
	mkdir -p dist
	browserify demo/demo.js > dist/browserify-bundle.js

watch:
	mkdir -p dist
	browserify demo/demo.js -o dist/browserify-bundle.js --watch --debug

