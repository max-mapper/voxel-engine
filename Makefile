all: concat
 
concat:
	mkdir -p dist
	browserify demo/demo.js > dist/browserify-bundle.js

watch:
	make
	filewatcherthing lib/ make
