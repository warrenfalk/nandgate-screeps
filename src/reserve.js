"use strict";

const findClosestSpawnRoom = require('./findClosestSpawnRoom');

let projects;
let unemployed;

/*
{id: "R1", room: "W23S68", fromRoom: "W23S69"}
*/

function Reserve(flag) {
    this.flag = flag;
    this.stats = {
        ttl: 0,
    };
}
Reserve.prototype.isPaused = function() {
    return false;
}
Reserve.prototype.getId = function() {
    return this.flag.name;
}
Reserve.prototype.getSendingRoomName = function() {
    return findClosestSpawnRoom(this.flag.pos);
}
Reserve.prototype.getDesiredTtl = function() {
    return 350;
}

const ReserveSector = {
    init: function() {
        global.Reserve = ReserveSector
        unemployed = {
            claimer: [],
        }
        projects = {};
        for (let name in Game.flags) {
            let flag = Game.flags[name];
            if (flag.color !== COLOR_PURPLE)
                continue;
            if (!/Reserve:/.test(flag.name))
                continue;
            projects[name] = new Reserve(flag);
        }
    },
    run: function(room) {
    },
    stats: function(creep) {
        let project = projects[creep.memory.project||'none'];
        if (!project) {
            delete creep.memory.project;
            unemployed.claimer.push(creep);
            return;
        }
        project.stats.ttl += creep.ticksToLive;
    },
    request: function(makeRequest) {
        for (let name in projects) {
            let project = projects[name];
            if (project.isPaused())
                continue;
            while (project.stats.ttl < project.getDesiredTtl() && unemployed.claimer.length) {
                let creep = unemployed.claimer.pop();
                console.log(creep.name, "=> reserve", project.getId());
                project.stats.ttl += creep.ticksToLive;
                creep.memory.project = project.getId();
            }
            if (project.stats.ttl < project.getDesiredTtl()) {
                console.log("reserve", project.getId(), "with", project.stats.ttl, "of", project.getDesiredTtl(), "ttl, requesting creep");
                makeRequest(project.getSendingRoomName(), {providing:'reserve', creep: {parts:[CLAIM,MOVE,MOVE],sector:'reserve',max:700}});
            }
        }
    },
    employ: function(creep) {
        let project = projects[creep.memory.project||'none'];
        if (!project)
            return;
        if (project.isPaused()) {
            return;
        }
        if (creep.spawning)
            return;
        // we need to get the location of the controller in the room
        // if we have no creeps in the room, we'll need to send a scout
        // unless we've sent one previously and remembered the location
        let target = (project.flag.room && project.flag.room.controller && project.flag.room.controller.pos) || project.flag.pos;
        // if we're in the right room, find invaders and kill them
        if (target.roomName === creep.room.name && (creep.getActiveBodyparts(ATTACK) || creep.getActiveBodyparts(RANGED_ATTACK))) {
            let invaders = creep.room.invaders;
            if (invaders.length) {
                let closest = creep.pos.findClosestByRange(invaders);
                let distance = creep.pos.getRangeTo(closest);
                if (distance <= 1)
                    creep.attack(closest);
                else if (distance <= 3 && creep.getActiveBodyparts(RANGED_ATTACK))
                    creep.rangedAttack(closest);
                if (distance > 3 || closest.getActiveBodyparts(ATTACK) == 0)
                    creep.moveTo(closest);
                return;
            }
        }
        if (target.getRangeTo(creep) > 1) {
            creep.moveTo(target, {ignoreCreeps: false});
        }
        else {
            creep.reserveController(creep.room.controller);
        }
    },
};

module.exports = ReserveSector;
