/*
The purpose of a tower drain is to sit outside a defender's room with some healers
and have a tough scout enter the room to get pummeled by towers
when the tough scout gets damaged enough, he retreats to the other room for the healers
to heal him and when healed enough re-enters the room

once towers are depleted, attackers can enter
*/
const _ = require('lodash');

function TowerDrain(flag) {
    this.flag = flag;
}

let tdteams;
let unemployed;

const TowerDrainSector = {
    init: function() {
        unemployed = [];
        tdteams = {};
        for (let name in Game.flags) {
            let flag = Game.flags[name];
            if (flag.color !== COLOR_PURPLE)
                continue;
            if (!/TwrDrn:/.test(flag.name))
                continue;
            tdteams[name] = new TowerDrain(flag);
        }
    },
    run: function(room) {

    },
    stats: function(creep) {
        let name = creep.memory.tdteam;
        if (!name) {
            unemployed.push(creep);
            return;
        }
        let tdteam = tdteams[name];
        if (tdteam) 
            tdteam.creep = creep;
        else {
            delete creep.memory.tdteam;
            unemployed.push(creep);
        }
    },
    employ: function(creep) {
        let name = creep.memory.tdteam;
        if (!name)
            return;
        let tdteam = tdteams[name];
        if (creep.pos.getRangeTo(tdteam.flag) != 0)
            creep.moveTo(tdteam.flag);
    },
    request: function(makeRequest) {
        for (let name in tdteams) {
            let tdteam = tdteams[name];
            if (!tdteam.creep) {
                if (unemployed.length) {
                    let creep = unemployed.pop();
                    creep.memory.tdteam = name;
                    console.log(creep.name, "=> tdteam", name);
                    return;
                }
                // find the closest spawn
                let closest;
                for (var spawnName in Game.spawns) {
                    let spawn = Game.spawns[spawnName];
                    let route = Game.map.findRoute(spawn.room, tdteam.flag.pos.roomName);
                    if (!closest || closest.distance > route.length)
                        closest = {distance: route.length, room: spawn.room};
                }
                console.log("tdteam", name, "requesting creep from room", closest.room.name);
                makeRequest(closest.room.name, {providing:'tdteam', creep: {assembly:[WORK,CARRY,MOVE,MOVE],sector:'scout'}});
            }
        }
    },
}

module.exports = TowerDrainSector;