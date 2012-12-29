var utils = {
  times: function(num, fn) {
    var i, _results;
    i = 0;
    _results = [];
    while (i < num) {
      _results.push(fn(i++));
    }
    return _results;
  }
}
