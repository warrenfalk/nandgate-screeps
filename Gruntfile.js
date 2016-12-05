"use strict";
let password;
try { password = require('./password.json') } catch(e) { console.error("Create password.json"); }

module.exports = function(grunt) {
 
    grunt.loadNpmTasks('grunt-screeps');
 
    grunt.initConfig({
        screeps: {
            options: {
                email: 'warren@warrenfalk.com',
                password: password,
                branch: 'default',
                ptr: false
            },
            dist: {
                src: ['src/*.js']
            }
        }
    });
}