"use strict";
let password;
try { password = require('./password.json') } catch(e) { console.error("Create password.json"); }

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-screeps');
    grunt.loadNpmTasks('grunt-git');

    grunt.initConfig({
        gitadd: {
            src: {
                options: {
                },
                files: {
                    src: ['src'],
                },
            },
        },
        gitcheckout: {
            src: {
                options: {
                    branch: process.env.SCREEPS_BRANCH || 'default',
                    overwrite: true,
                },
            },
        },
        gitcommit: {
            src: {
                options: {
                    message: 'Update',
                },
                files: {
                    src: ['src'],
                },
            },
        },
        gitpush: {
            src: {
                options: {
                    remote: 'origin',
                    branch: process.env.SCREEPS_BRANCH || 'default',
                    force: 'true',
                },
            },
        },
        screeps: {
            options: {
                email: 'warren@warrenfalk.com',
                password: password,
                branch: process.env.SCREEPS_BRANCH || 'default',
                ptr: false,
            },
            dist: {
                src: ['src/*.js'],
            },
        },
    });

    grunt.registerTask('send', ['gitadd:src', 'gitcheckout:src', 'gitcommit:src', 'gitpush:src', 'screeps'])
}
