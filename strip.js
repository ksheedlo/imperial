#!/usr/bin/env node

var argv = require('optimist').argv;
var esprima = require('esprima');
var escodegen = require('escodegen');
var fs = require('fs');
var strip = require('./minerrparse.js')();
var path = require('path');
var Q = require('q');

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
            console.log(resultSource);
            return Q.nfcall(fs.writeFile, output, resultSource);
          });
}

var extractedErrors = {};

stripFile('demo/test1.js', 'demo/test1.strip.js', extractedErrors)
.then(function () {
  console.log(extractedErrors);
})
.done();
