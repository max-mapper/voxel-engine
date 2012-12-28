var utils = {
  mod: function(num, arg) {
    if (num >= 0) {
      return num % arg;
    }
    return (num + arg) % arg;
  },
  div: function(num, arg) {
    return Math.floor(num / arg);
  },
  times: function(num, fn) {
    var i, _results;
    i = 0;
    _results = [];
    while (i < num) {
      _results.push(fn(i++));
    }
    return _results;
  },
  toRadians: function(num) {
    return (num * Math.PI) / 180;
  },
  toDegrees: function(num) {
    return (num * 180) / Math.PI;
  }
};

