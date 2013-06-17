'use strict';

/*global toString*/

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
  if (ast.callee.type === 'Identifier' && ast.callee.name.match(/^.+MinErr$/)) {
    return true;
  }
  if (isMinErrCall(ast.callee)) {
    return true;
  }
  return false;
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
    transformHandlers;

  if (props) {
    logger = props.logger || { error: console.error };
  }

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
        extractedErrors[ast.arguments[0].value] = ast.arguments[1].value;
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
