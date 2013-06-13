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

module.exports = function (props) {
  var logger = props.logger || { error: console.error },
    transform,
    transformHandlers;

  transformHandlers = {
    ThrowStatement: function (ast, extractedErrors) {
      var copyAST = deepCopy(ast), astErr, changedErrors;
      if (isMinErrInstance(ast.argument)) {
        astErr = transform(ast.argument, extractedErrors);
        copyAST.argument = astErr.ast;
        changedErrors = astErr.extractedErrors;
      } else {
        logger.error('Throwing an error that is not a MinErr instance');
        changedErrors = extractedErrors;
      }
      return {
        ast: copyAST,
        extractedErrors: changedErrors
      };
    },
    CallExpression: function (ast, extractedErrors) {
      // If this is a MinErr instance, delete the template string.
      var copyAST = deepCopy(ast), changedErrors = deepCopy(extractedErrors);
      if (isMinErrInstance(ast)) {
        copyAST.arguments = [].concat(ast.arguments[0], ast.arguments.slice(2));
        changedErrors[ast.arguments[0].value] = ast.arguments[1].value;
      }
      return {
        ast: copyAST,
        extractedErrors: changedErrors
      };
    },
  };

  transform = function (ast, extractedErrors) {
    var copyAST = deepCopy(ast),
      astErr,
      astReduce,
      changedErrors = extractedErrors;

    if (transformHandlers[ast.type]) {
      return transformHandlers[ast.type](ast, extractedErrors);
    }

    astReduce = function (iAstErr, ast) {
      var nextAstErr = transform(ast, iAstErr.extractedErrors),
        nextAsts = iAstErr.ast.concat(nextAstErr.ast);
      return {
        ast: nextAsts,
        extractedErrors: nextAstErr.extractedErrors
      };
    };

    for (var property in ast) {
      if (isAST(ast[property])) {
        astErr = transform(ast[property], extractedErrors);
        copyAST[property] = astErr.ast;
        changedErrors = astErr.extractedErrors;
      }
      if (isASTArray(ast[property])) {
        astErr = ast[property].reduce(astReduce, { ast: [], extractedErrors: changedErrors });
        copyAST[property] = astErr.ast;
        changedErrors = astErr.extractedErrors;
      }
    }
    return {
      ast: copyAST,
      extractedErrors: changedErrors
    };
  };

  return function (ast) {
    return transform(ast, {});
  };
};
