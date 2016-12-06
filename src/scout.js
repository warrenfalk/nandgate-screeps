const _ = require('lodash');

function Scout(flag) {
    this.flag = flag;
}

let scouts;
let unemployed;

function distanceBetweenRooms(roomName1, roomName2, diagonal){
    if( roomName1 == roomName2 ) return 0;
    let posA = roomName1.split(/([N,E,S,W])/);
    let posB = roomName2.split(/([N,E,S,W])/);
    let xDif = posA[1] == posB[1] ? Math.abs(posA[2]-posB[2]) : posA[2]+posB[2]+1;
    let yDif = posA[3] == posB[3] ? Math.abs(posA[4]-posB[4]) : posA[4]+posB[4]+1;
    if( diagonal ) return Math.max(xDif, yDif); // count diagonal as 1 
    return xDif + yDif; // count diagonal as 2 
}

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
                    let distance = distanceBetweenRooms(spawn.room.name, scout.flag.pos.roomName, 2);
                    console.log("scout", name, "requesting creep", spawnName, distance);
                    // makeRequest(roomName, {providing:'energy', creep: {parts:[CARRY,MOVE],sector:'ferry',max:350}});
                }
            }
        }
    },
}

module.exports = ScoutSector;