all: concat
 
concat:
	browserify demo/blocking.js > dist/browserify-bundle.js

watch:
	make
	filewatcherthing lib/ make
