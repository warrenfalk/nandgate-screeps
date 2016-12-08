"use strict";

const projects = {};

const unemployed = [];

/*
{id: "R1", room: "W23S68", fromRoom: "W23S69"}
*/

function Project(def) {
    this.def = def;
    this.stats = {
        ttl: 0,
    };
}
Project.prototype.isPaused = function() {
    return this.def.paused;
}
Project.prototype.getId = function() {
    return this.def.id;
}
Project.prototype.getSendingRoomName = function() {
    return this.def.fromRoom;
}
Project.prototype.getRoom = function() {
    return this.def.room;
}
Project.prototype.getDesiredTtl = function() {
    return this.def.ttl || 350;
}
Project.prototype.pause = function() {
    this.def.paused = true;
    this.paused = true;
}
Project.prototype.unpause = function() {
    delete this.def.paused;
    this.paused = false;
}

const Reserve = {
    init: function() {
        global.Reserve = Reserve
        let defs = Memory.reservers||{};
        for (var id in defs) {
            projects[id] = new Project(defs[id]);
        }
    },
    run: function(room) {
    },
    stats: function(creep) {
        let project = projects[creep.memory.project||'none'];
        if (!project) {
            delete creep.memory.project;
            unemployed.push(creep);
            return;
        }
        project.stats.ttl += creep.ticksToLive;
    },
    request: function(makeRequest) {
        for (let name in projects) {
            let project = projects[name];
            if (project.isPaused())
                continue;
            while (project.stats.ttl < project.getDesiredTtl() && unemployed.length) {
                let creep = unemployed.pop();
                console.log(creep.name, "=> reserve", project.getId());
                project.stats.ttl += creep.ticksToLive;
                creep.memory.project = project.getId();
            }
            if (project.stats.ttl < project.getDesiredTtl()) {
                console.log("reserve", project.getId(), "with", project.stats.ttl, "of", project.getDesiredTtl(), "ttl, requesting creep");
                makeRequest(project.getSendingRoomName(), {providing:'reserve', creep: {parts:[CLAIM,MOVE,ATTACK,MOVE,MOVE,MOVE],sector:'reserve',max:880}});
            }
        }
    },
    employ: function(creep) {
        let project = projects[creep.memory.project||'none'];
        if (!project)
            return;
        if (project.isPaused())
            return;
        if (creep.spawning)
            return;
        // we need to get the location of the controller in the room
        // if we have no creeps in the room, we'll need to send a scout
        // unless we've sent one previously and remembered the location
        let controllerPos;
        let room = Game.rooms[project.getRoom()];
        controllerPos = room ? room.controller.pos : (Memory.controllers && Memory.controllers[project.getRoom()]);
        if (!controllerPos) {
            console.log("TODO: send scout");
            return;
        }
        let target = new RoomPosition(controllerPos.x, controllerPos.y, controllerPos.roomName);
        // if we're in the right room, find invaders and kill them
        if (target.roomName === creep.room.name) {
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
        if (target.getRangeTo(creep) > 4) {
            creep.moveTo(target, {ignoreCreeps: true});
        }
        else if (target.getRangeTo(creep) > 1) {
            creep.moveTo(target, {ignoreCreeps: false});
        }
        else {
            creep.reserveController(creep.room.controller);
        }
    },
    create: function(reserveDef) {
        let defs = Memory.reservers||{};
        defs[reserveDef.id] = reserveDef;
        Memory.reservers = defs;
    },
    list: function() {
        let defs = Memory.reservers||{};
        for (let name in defs) {
            let def = defs[name];
            console.log(name, "=>", JSON.stringify(def));
        }
    },
    pause: function(id,pauseFor) {
        let project = projects[id];
        project.pause(pauseFor);
        return JSON.stringify(project.def);
    },
    unpause: function(id) {
        let project = projects[id];
        project.unpause();
        return JSON.stringify(project.def);
    },
};

module.exports = Reserve;
