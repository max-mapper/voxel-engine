var http = require('http')
var ecstatic = require('ecstatic')
http.createServer(ecstatic(__dirname)).listen(8080)
console.log('Listening on :8080, open http://localhost:8080/demo')