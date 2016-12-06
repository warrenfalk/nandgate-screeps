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
                    src: ['src']
                },
            },
        },
        gitcheckout: {
            src: {
                options: {
                    branch: 'deployed',
                    overwrite: true,
                }
            }
        },
        gitcommit: {
            src: {
                options: {
                    message: 'Update',
                },
                files: {
                    src: ['src']
                },
            }
        },
        gitpush: {
            src: {
                options: {
                    remote: 'origin',
                    branch: 'deployed',
                    force: 'true'
                }
            }
        },
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

    grunt.registerTask('send', ['gitadd:src', 'gitcheckout:src', 'gitcommit:src', 'gitpush:src', 'screeps'])
}