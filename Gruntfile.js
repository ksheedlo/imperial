'use strict';

module.exports = function (grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      all: ['minerrparse.js', './spec/**/*.js'],
      options: {
        strict: true,
        globalstrict: true,
        maxlen: 100,
        trailing: true,
        unused: true,
        quotmark: 'single',
        eqeqeq: true,
        indent: 2,
        node: true,
      }
    },
    "jasmine-node": {
      run: {
        spec: "spec"
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-contrib-jasmine-node');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  
  grunt.registerTask('default', ['jshint', 'jasmine-node']);
};

