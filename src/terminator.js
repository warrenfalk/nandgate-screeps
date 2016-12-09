"use strict";
const findClosestSpawnRoom = require('findClosestSpawnRoom');
/*
this is like a special forces thing
When others need a strike force because of an invader, they tag the invader and room
and request an attack force to come deal with it
this should be highest priority as long as the request is being refreshed
but we also want to make sure that it only creates a creep powerful enough to beat an invader

we would like to also be able to unpause anything that was paused due to the invader if the invader is killed
*/

let targets;
let unemployed;

function getCreepMemory(creep) {
    let memory = creep.memory.terminator;
    if (!memory)
        creep.memory.terminator = memory = {};
    return memory;
}

function assignTarget(target, creep) {
    target.creep = creep;
    let memory = getCreepMemory(creep);
    memory.target = target.id;
    memory.room = target.room;
    console.log(creep, "=> terminate", target.id);
}

function isDangerous(invader) {
    // an invader with attack parts is dangerous
    if ((invader.getActiveBodyparts(ATTACK) + invader.getActiveBodyparts(RANGED_ATTACK)) > 0)
        return true;
    // an invader with work parts that gets too close is dangerous
    if ((invader.getActiveBodyparts(WORK) > 0) && invader.pos.findInRange(FIND_MY_STRUCTURES, 8).length)
        return true;
    return false;
}

const StrikeSector = {
    init: function() {
        unemployed = [];
        targets = {};
        let memory = Memory.terminators;
        if (!memory)
            Memory.terminators = memory = {targets: {}};
        for (let targetId in memory.targets) {
            let target = memory.targets[targetId];
            targets[targetId] = {room: target.room};
        }
    },
    run: function(room) {
        let remembered = Memory.terminators.targets;
        room.invaders.filter(invader => isDangerous(invader)).forEach(invader => {
            let id = invader.id;
            if (!targets[id])
                Game.notify("new invader "+invader.id+" "+(invader.owner && invader.owner.name)+" "+room.name+" "+JSON.stringify(invader.body), 0);
            targets[id] = {id: id, room: room.name, hostile: invader};
            remembered[id] = {room: room.name};
        });
        let forget = [];
        for (let targetId in remembered) {
            let target = remembered[targetId];
            let roomName = target.room;
            if (roomName !== room.name)
                continue;
            // if we've remembered an invader in a room, but we just got done searching the room and the invader isn't there, forget him
            let seen = targets[targetId];
            if (!seen.hostile)
                forget.push(targetId);
        }
        forget.forEach(targetId => {
            Game.notify("forget invader "+targetId, 0);
            delete remembered[targetId];
        })
    },
    stats: function(creep) {
        let memory = getCreepMemory(creep);
        let targetId = memory.target;
        let target = targets[targetId];
        if (!target) {
            delete memory.target;
            unemployed.push(creep);
            return;
        }
        target.terminator = creep;
    },
    employ: function(creep) {
        let memory = getCreepMemory(creep);
        let targetId = memory.target;
        let hostile, room;
        if (targetId) {
            let target = targets[targetId];
            room = target.room;
            hostile = target.hostile;
        }
        else {
            // now kill anything remaining in the room with even non-active attack parts
            hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, {filter: c => c.body.some(b => b === ATTACK || b === RANGED_ATTACK)})
            if (!hostile)
                return;
        }
        if (hostile) {
            creep.moveTo(hostile);
            creep.attack(hostile);
        }
        else {
            creep.moveTo(new RoomPosition(25, 25, room));
        }
        console.log("terminator",creep.name,"=>",targetId);
    },
    request: function(makeRequest) {
        for (let targetId in targets) {
            let target = targets[targetId];
            if (!target.terminator) {
                if (unemployed.length) {
                    let candidate = unemployed.pop();
                    assignTarget(target, candidate);
                }
                else {
                    let targetPos = (target.hostile && target.hostile.pos) || new RoomPosition(25, 25, target.room);
                    let roomName = findClosestSpawnRoom(targetPos)
                    console.log("Requesting creep to terminate", targetId);
                    makeRequest(roomName, {providing:'energy', creep: {parts:[ATTACK,MOVE],sector:'terminator',max:650}});
                }
            }
        }
    },
}

module.exports = StrikeSector;
