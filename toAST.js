#!/usr/bin/env node

var esprima = require('esprima'),
  fs = require('fs'),
  argv = require('optimist').argv,
  path = require('path');

argv._.forEach(function (file) {
  var output = file + 'on'; // .js -> .json

  fs.readFile(file, function (err, code) {
    var ast;

    if (err) {
      throw err;
    }

    ast = esprima.parse(code);
    fs.writeFile(output, JSON.stringify(ast, null, 2));
  });
});
