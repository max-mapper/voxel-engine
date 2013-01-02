DEPS = deps/three.js \
	deps/PointerLockControls.js \
	deps/askForPointerLock.js \
	deps/Stats.js \
	deps/Detector.js \
	deps/voxel-browserified.js \
	deps/browserify-bundle.js

all: concat
 
concat:
	browserify -r voxel-mesh > deps/browserify-bundle.js
	cat lib/*.js > lib.js
	cat $(DEPS) > deps.js

watch:
	make
	filewatcherthing lib/ make