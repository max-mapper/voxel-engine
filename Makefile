DEPS = deps/three.js \
	deps/PointerLockControls.js \
	deps/askForPointerLock.js \
	deps/Stats.js \
	deps/Detector.js

all: concat
 
concat:
	cat lib/*.js > lib.js
	cat $(DEPS) > deps.js