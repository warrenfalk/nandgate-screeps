/*
A quarry is a system for distant mining

It is a miner who sits on the mine
Carriers who ferry the energy
And a builder who builds and maintains a road
*/

/*
The purpose of a tower drain is to sit outside a defender's room with some healers
and have a tough scout enter the room to get pummeled by towers
when the tough scout gets damaged enough, he retreats to the other room for the healers
to heal him and when healed enough re-enters the room

once towers are depleted, attackers can enter
*/
const _ = require('lodash');

function Quarry(flag) {
    this.flag = flag;
    this.carriers = [];
    this.miner = null;
    this.construct = null;
}
Quarry.prototype.employ = function(creep) {
    let workParts = creep.getActiveBodyparts(WORK);
    let carryParts = creep.getActiveBodyparts(CARRY);
    if (workParts > 0) {
        if (!this.miner) {
            this.miner = creep;
        }
        else if (!this.construct && (carryParts || this.miner.getActiveBodyparts(CARRY))) {
            this.construct = creep;
            this.balance();
        }
        else {
            // this quarry is full, or this guy is unqualified so this guy is unemployed
            unemployed.push(creep);
            delete creep.memory.quarry;
        }
    }
    else if (carryParts > 0) {
        this.carriers.push(creep);
    }
    else {
        unemployed.push(creep);
        delete creep.memory.quarry;
        return;
    }
}
Quarry.prototype.balance = function() {
    // if the constructor has no carry, then swap them
    if (this.construct.getActiveBodyparts(CARRY) == 0)
        this.swap();
    // the one with the closest to 5 work parts should be the miner
    if (Math.abs(5 - this.miner.getActiveBodyparts(WORK)) > Math.abs(5 - this.construct.getActiveBodyParts(CONSTRUCT)))
        this.swap();
}
Quarry.prototype.swap = function() {
    const t = this.construct;
    this.construct = this.miner;
    this.miner = t;
}

let quarryTeams;
let unemployed;

const QuarrySector = {
    init: function() {
        unemployed = [];
        quarryTeams = {};
        for (let name in Game.flags) {
            let flag = Game.flags[name];
            if (flag.color !== COLOR_PURPLE)
                continue;
            if (!/Quarry:/.test(flag.name))
                continue;
            quarryTeams[name] = new Quarry(flag);
        }
    },
    run: function(room) {

    },
    stats: function(creep) {
        let name = creep.memory.quarry;
        if (!name) {
            unemployed.push(creep);
            return;
        }
        let quarry = quarryTeams[name];
        quarry.employ(creep);
    },
    employ: function(creep) {
        let name = creep.memory.quarry;
        if (!name)
            return;
        let quarry = quarryTeams[name];
        if (creep.pos.getRangeTo(quarry.flag) != 0)
            creep.moveTo(quarry.flag);
    },
    request: function(makeRequest) {
        for (let name in quarryTeams) {
            let quarry = quarryTeams[name];
            if (!quarry.creep) {
                if (unemployed.length) {
                    let creep = unemployed.pop();
                    creep.memory.quarry = name;
                    console.log(creep.name, "=> quarry", name);
                    return;
                }
                // find the closest spawn
                let closest;
                for (var spawnName in Game.spawns) {
                    let spawn = Game.spawns[spawnName];
                    let route = Game.map.findRoute(spawn.room, quarry.flag.pos.roomName);
                    if (!closest || closest.distance > route.length)
                        closest = {distance: route.length, room: spawn.room};
                }
                console.log("quarry", name, "requesting creep from room", closest.room.name);
                makeRequest(closest.room.name, {providing:'quarry', creep: {assembly:[WORK,CARRY,MOVE,MOVE],sector:'scout'}});
            }
        }
    },
}

module.exports = QuarrySector;