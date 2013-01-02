DEPS = deps/three.js \
	deps/askForPointerLock.js \
	deps/Stats.js \
	deps/Detector.js \
	deps/voxel-browserified.js \
	deps/browserify-bundle.js

all: concat
 
concat:
	mkdir -p dist
	browserify -r voxel-mesh > deps/browserify-bundle.js
	cat lib/*.js > dist/lib.js
	cat $(DEPS) > dist/deps.js

watch:
	make
	filewatcherthing lib/ make