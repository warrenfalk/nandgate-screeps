"use strict";

function Scout(flag) {
    this.flag = flag;
}

let scouts;
let unemployed;

const ScoutSector = {
    init: function() {
        unemployed = [];
        scouts = {};
        for (let name in Game.flags) {
            let flag = Game.flags[name];
            if (flag.color !== COLOR_PURPLE)
                continue;
            if (!/^Scout:/.test(flag.name))
                continue;
            scouts[name] = new Scout(flag);
        }
    },
    run: function(room) {
    },
    stats: function(creep) {
        let name = creep.memory.scout;
        if (!name) {
            unemployed.push(creep);
            return;
        }
        let scout = scouts[name];
        if (scout)
            scout.creep = creep;
        else {
            delete creep.memory.scout;
            unemployed.push(creep);
        }
    },
    employ: function(creep) {
        let name = creep.memory.scout;
        if (!name)
            return;
        let scout = scouts[name];
        if (creep.pos.getRangeTo(scout.flag) != 0)
            creep.moveTo(scout.flag);
    },
    request: function(makeRequest) {
        for (let name in scouts) {
            let scout = scouts[name];
            if (!scout.creep) {
                if (unemployed.length) {
                    let creep = unemployed.pop();
                    creep.memory.scout = name;
                    console.log(creep.name, "=> scout", name);
                    return;
                }
                // find the closest spawn
                let closest;
                for (var spawnName in Game.spawns) {
                    let spawn = Game.spawns[spawnName];
                    let route = Game.map.findRoute(spawn.room, scout.flag.pos.roomName);
                    if (!closest || closest.distance > route.length)
                        closest = {distance: route.length, room: spawn.room};
                }
                console.log("scout", name, "requesting creep from room", closest.room.name);
                makeRequest(closest.room.name, {providing:'scout', creep: {assembly:[WORK,CARRY,MOVE,MOVE],sector:'scout'}});
            }
        }
    },
}

module.exports = ScoutSector;
