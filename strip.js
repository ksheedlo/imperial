#!/usr/bin/env node

var argv = require('optimist').argv;
var esprima = require('esprima');
var escodegen = require('escodegen');
var fs = require('fs');
var stripper = require('./minerrparse.js');
var path = require('path');
var Q = require('q');

var strip = stripper({ minErrAst: esprima.parse(fs.readFileSync('minerrMin.js')).body[0] });

function stripFile(filename, output, extractedErrors) {
  return Q.nfcall(fs.readFile, filename)
          .then(function (code) {
            var ast, strippedAst, resultSource;
            ast = esprima.parse(code, { loc: true });
            strippedAst = strip(ast, extractedErrors);
            resultSource = escodegen.generate(strippedAst, {
                format: {
                  indent: {
                    style: '  ',
                    base: 0,
                  }
                }
              });
            return Q.nfcall(fs.writeFile, output, resultSource);
          });
}


argv._.forEach(function (file) {
  var extractedErrors = {},
    stripFilename = path.dirname(file) + path.sep + path.basename(file, '.js') + '.strip.js';
  stripFile(file, stripFilename, extractedErrors)
  .then(function () {
    console.log(extractedErrors);
  })
  .done();
});
