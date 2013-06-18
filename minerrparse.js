'use strict';

/*global toString*/

var escodegen = require('escodegen');

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function isAST(obj) {
  return obj && typeof(obj) === 'object' && obj.type !== undefined;
}

function isASTArray(value) {
  if (toString.apply(value) === '[object Array]') {
    return value.every(isAST);
  }
  return false;
}

function isMinErrCall(ast) {
  // Returns true if the AST represents a call to 'minErr', false otherwise.
  // Code example:
  //
  //    minErr('test'); // isMinErrCall() returns true
  //
  if (ast.type !== 'CallExpression') {
    return false;
  }
  if (ast.callee.type === 'Identifier' && ast.callee.name === 'minErr') {
    return true;
  }
  return false;
}

function isMinErrInstance(ast) {
  // MinErr instance must be a call expression.
  // throw minErr([module])(code, template, ...)
  // throw moduleMinErr(code, template, ...)
  if (ast.type !== 'CallExpression') {
    return false;
  }
  if (ast.callee.type === 'Identifier' && ast.callee.name.match(/^\S+MinErr$/)) {
    return true;
  }
  if (isMinErrCall(ast.callee)) {
    return true;
  }
  return false;
}

function toCode(ast) {
  return escodegen.generate(ast, {
      format: {
        indent: {
          style: '  ',
          base: 0,
        }
      }
    });
}

function getString(ast) {
  if (ast.type === 'Literal') {
    return ast.value;
  } else if (ast.type === 'BinaryExpression' && ast.operator === '+') {
    return getString(ast.left) + getString(ast.right);
  }
  throw new Error('Can\'t determine static value of expression: ' + toCode(ast));
}

function getNamespace(instance) {
  if (instance.callee.type === 'Identifier') {
    return instance.callee.name.match(/^(\S+)MinErr$/)[1];
  } else if (instance.callee.arguments) {
    return getString(instance.callee.arguments[0]);
  }
  return undefined;
}

function makeLogMessage(filename, loc, message) {
  if (loc && filename) {
    return filename + ':' + loc.start.line + ':' + loc.start.column + ': ' + message;
  }
  if (loc) {
    return loc.start.line + ':' + loc.start.column + ': ' + message;
  }
  if (filename) {
    return filename + ': ' + message;
  }
  return message;
}

module.exports = function (props) {
  var filename = '',
    logger,
    transform,
    transformHandlers,
    updateErrors,
    updateErrorsInNamespace;

  if (props) {
    logger = props.logger || { error: console.error };
  } else {
    logger = { error: console.error };
  }

  updateErrorsInNamespace = function (code, message, instance, namespacedErrors) {
    if (namespacedErrors[code]) {
      if (namespacedErrors[code] !== message) {
        logger.error(makeLogMessage(filename, instance.loc,
          'Errors with the same code have different messages'));
      }
    } else {
      namespacedErrors[code] = message;
    }
  };

  updateErrors = function (instance, extractedErrors) {
    var code = getString(instance.arguments[0]),
      message = getString(instance.arguments[1]),
      namespace = getNamespace(instance);
  
    if (namespace === undefined) {
      updateErrorsInNamespace(code, message, instance, extractedErrors);
    }
    if (!extractedErrors[namespace]) {
      extractedErrors[namespace] = {};
    }
    updateErrorsInNamespace(code, message, instance, extractedErrors[namespace]);
  };

  transformHandlers = {
    ThrowStatement: function (ast, extractedErrors) {
      var copyAST = deepCopy(ast);
      if (isMinErrInstance(ast.argument)) {
        copyAST.argument = transform(ast.argument, extractedErrors);
      } else {
        logger.error(makeLogMessage(filename, ast.loc, 'Error is not a minErr instance'));
      }
      return copyAST;
    },
    CallExpression: function (ast, extractedErrors) {
      // If this is a MinErr instance, delete the template string.
      var copyAST = deepCopy(ast);
      if (isMinErrInstance(ast)) {
        copyAST.arguments = [].concat(ast.arguments[0], ast.arguments.slice(2));
        updateErrors(ast, extractedErrors);
      } else {
        copyAST.callee = transform(ast.callee, extractedErrors);
        copyAST.arguments = ast.arguments.map(function (argument) {
            return transform(argument, extractedErrors);
          });
      }
      return copyAST;
    },
  };

  transform = function (ast, extractedErrors) {
    var copyAST, astReduce;


    if (transformHandlers[ast.type]) {
      return transformHandlers[ast.type](ast, extractedErrors);
    }
    copyAST = deepCopy(ast);

    astReduce = function (iAstArray, ast) {
      var nextAst = transform(ast, extractedErrors);
      return iAstArray.concat(nextAst);
    };

    for (var property in ast) {
      if (isAST(ast[property])) {
        copyAST[property] = transform(ast[property], extractedErrors);
      }
      if (isASTArray(ast[property])) {
        copyAST[property] = ast[property].reduce(astReduce, []);
      }
    }
    return copyAST;
  };

  return function (ast, errors, sourceFilename) {
    var result;
    filename = sourceFilename || '';
    result = transform(ast, errors);
    filename = '';
    return result;
  };
};
