'use strict';

/*global toString*/

module.exports = (function () {
  var deepCopy,
    defaultLogger,
    isASTArray,
    isAST,
    isMinErr;

  defaultLogger = function () {
    return {
      error: console.error
    };
  };

  deepCopy = function (obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  isAST = function (obj) {
    return obj && typeof(obj) === 'object' && obj.type !== undefined;
  };

  isASTArray = function (value) {
    if (toString.apply(value) === '[object Array]') {
      return value.every(isAST);
    }
    return false;
  };
  
  isMinErr = function (ast) {
    // MinErr instance must be a call expression.
    // throw minErr([module])(code, template, ...)
    // throw moduleMinErr(code, template, ...)
    if (ast.type !== 'CallExpression') {
      return false;
    }
    if (ast.callee.type === 'Identifier' && ast.callee.name.match(/^.+MinErr$/)) {
      return true;
    }
    if (ast.callee.type === 'CallExpression') {
      if (ast.callee.callee.type === 'Identifier' && ast.callee.callee.name === 'minErr') {
        return true;
      }
    }
    return false;
  };
  
  return function (props) {
    var logger = props.logger || defaultLogger(),
      transform,
      transformHandlers;
  
    transformHandlers = {
      ThrowStatement: function (ast, error) {
        var copyAST = deepCopy(ast), astErr;
        if (!isMinErr(ast.argument)) {
          logger.error('Throwing an error that is not a MinErr instance');
        }
        astErr = transform(ast.argument, error);
        copyAST.argument = astErr.ast;
        return {
          ast: copyAST,
          error: astErr.error
        };
      },
      CallExpression: function (ast, error) {
        // If this is a MinErr instance, delete the template string.
        var copyAST = deepCopy(ast), _error = deepCopy(error);
        if (isMinErr(ast)) {
          copyAST.arguments = [].concat(ast.arguments[0], ast.arguments.slice(2));
          _error[ast.arguments[0].value] = ast.arguments[1].value;
        }
        return {
          ast: copyAST,
          error: _error
        };
      },
    };
  
    transform = function (ast, error) {
      var copyAST = deepCopy(ast),
        astErr,
        astReduce,
        _error = error;

      if (transformHandlers[ast.type]) {
        return transformHandlers[ast.type](ast, error);
      }

      astReduce = function (iAstErr, ast) {
        var nextAstErr = transform(ast, iAstErr.error),
          nextAsts = iAstErr.ast.concat(nextAstErr.ast);
        return {
          ast: nextAsts,
          error: nextAstErr.error
        };
      };

      for (var key in ast) {
        if (isAST(ast[key])) {
          astErr = transform(ast[key], error);
          copyAST[key] = astErr.ast;
          _error = astErr.error;
        }
        if (isASTArray(ast[key])) {
          astErr = ast[key].reduce(astReduce, { ast: [], error: _error });
          copyAST[key] = astErr.ast;
          _error = astErr.error;
        }
      }
      return {
        ast: copyAST,
        error: _error
      };
    };
  
    return {
      transform: function (ast) {
        return transform(ast, {});
      },
      isMinErr: isMinErr
    };
  };
})();
