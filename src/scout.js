const _ = require('lodash');

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
        scout.creep = creep;

    },
    employ: function(creep) {
        let name = creep.memory.scout;
        if (!name)
            return;
        let scout = scouts[name];
        if (creep.getRangeTo(scout.flag) != 0)
            creep.moveTo(scout.flag);
    },
    request: function(makeRequest) {
        for (let name in scouts) {
            let scout = scouts[name];
            if (!scout.creep) {
                // find the closest spawn
                let closest;
                for (var spawnName in Game.spawns) {
                    let spawn = Game.spawns[spawnName];
                    let route = Game.map.findRoute(spawn.room, scout.flag.pos.roomName);
                    console.log("scout", name, "requesting creep", spawnName, JSON.stringify(route));
                    // makeRequest(roomName, {providing:'energy', creep: {parts:[CARRY,MOVE],sector:'ferry',max:350}});
                }
            }
        }
    },
}

module.exports = ScoutSector;