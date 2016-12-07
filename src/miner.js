/*
    Miner.create({id: "miner1", loc: "flag1"});
*/
const _ = require('lodash');

let miners = {};
let unemployed = [];

function Miner(minerDef) {
    this.def = minerDef;
    this.loc = Game.flags[minerDef.loc];
    this.ttl = 0;
    this.paused = minerDef.paused || (minerDef.pauseUntil && (minerDef.pauseUntil > Game.time));
    if (minerDef.pauseUntil && !this.paused)
        delete minerDef.pauseUntil;
}
Miner.prototype.pause = function(pauseTime) {
    if (pauseTime) {
        this.def.pauseUntil = Game.time + pauseTime;
        delete this.def.paused;
    }
    else {
        this.def.paused = true;
        delete this.def.pauseUntil;
    }
    this.paused = true;
}
Miner.prototype.unpause = function() {
    delete this.def.paused;
    delete this.def.pauseUntil;
    this.paused = false;
}
Miner.prototype.getDesiredTtl = function() {
    return this.def.ttl || 35;
}

const Miners = {
    init: function() {
        global.Miner = Miners;
    },
    run: function(room) {
        let minerDefs = Memory.miners||{};
        for (var id in minerDefs) {
            miners[id] = new Miner(minerDefs[id]);
        }
    },
    stats: function(creep) {
        let miner = miners[creep.memory.mine||'none'];
        if (!miner) {
            delete creep.memory.mine;
            unemployed.push(creep);
            return;
        }
        miner.ttl += creep.spawning ? 1500 : creep.ticksToLive;
    },
    employ: function(creep) {
        let miner = miners[creep.memory.mine];
        if (!miner)
            return;
        if (!creep.room.isFriendly && creep.room.invaders.some(i => i.getActiveBodyparts(ATTACK) || i.getActiveBodyparts(RANGED_ATTACK))) {
            let invaderTtl = creep.room.invaders.reduce((ttl,invader) => ttl += (invader.ticksToLive||0), 0) || 1501;
            if (!miner.paused) {
                miner.pause(invaderTtl);
                Game.notify("invader detected, pausing "+miner.def.id+" for "+invaderTtl, 0);
            }
            // TODO: evade invaders
            let closestSpawn;
            for (let name in Game.spawns) {
                if (!closestSpawn || creep.pos.getRangeTo(closestSpawn) > creep.pos.getRangeTo(Game.spawns[name]))
                    closestSpawn = Game.spawns[name];
            }
            creep.moveTo(closestSpawn);
        }
        if (miner.paused)
            return;
        if (!miner.loc)
            return;
        if (!miner.loc.pos || !miner.loc.pos.roomName)
            return;
        let roomName = miner.loc.pos.roomName;
        /*
        if (creep.ticksToLive < 250 || creep.memory.renew) {
            let renewLoc = Game.spawns[creep.memory.renew];
            if (!renewLoc) {
                let room = Game.rooms[roomName];
                let spawns = room && room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN});
                if (!spawns || !spawns.length) {
                    let closest;
                    for (let name in Game.spawns) {
                        let spawn = Game.spawns[name];
                        if (!closest || creep.pos.getRangeTo(closest) > creep.pos.getRangeTo(spawn)) {
                            closest = spawn;
                        }
                    }
                    renewLoc = closest;
                }
                else {
                    renewLoc = spawns[0];
                }
                creep.memory.renew = renewLoc.name;
            }
            if (creep.ticksToLive > 1000) {
                delete creep.memory.renew;
            }
            let result = renewLoc.renewCreep(creep);
            if (result == ERR_NOT_IN_RANGE)
                creep.moveTo(renewLoc.pos);
        }
        else */
        if (creep.pos.x != miner.loc.pos.x || creep.pos.y != miner.loc.pos.y || creep.pos.roomName != miner.loc.pos.roomName) {
            creep.moveTo(miner.loc.pos);
        }
        else {
            if (!miner.def.transitTime) {
                let transitTime = 1500 - creep.ticksToLive;
                miner.def.transitTime = transitTime;
                if (transitTime > miner.getDesiredTtl())
                    Game.notify("Miner "+miner.def.id+" ttl="+miner.getDesiredTtl()+" transit="+transitTime);
            }
            let sources = creep.pos.findInRange(FIND_SOURCES, 1, {filter: s => s.energy > 0});
            let source = sources && sources[0];
            if (source) {
                creep.harvest(source);
            }
            else {
                let minerals = creep.pos.findInRange(FIND_MINERALS, 1);
                let mineral = minerals && minerals[0];
                if (mineral) {
                    let result = creep.harvest(mineral);
                    if (result !== OK && result !== ERR_TIRED)
                        console.log("harvest mineral",result);
                }
            }
        }
        containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter: 
            s => ((s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store[RESOURCE_ENERGY] < s.storeCapacity)
            || ((s.structureType === STRUCTURE_LINK) && s.energy < s.energyCapacity)});
        let dropped = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);

        let carry = _.sum(creep.carry);
        let unusedCarry = creep.carryCapacity - carry;

        dropped.forEach(d => {
            if (unusedCarry > 0) {
                creep.pickup(d);
                unusedCarry -= d.energy;
            }
        })
        for (var resourceType in creep.carry) {
            let amount = creep.carry[resourceType];
            if (amount) {
                if (containers.length) {
                    containers.forEach(container => {
                        creep.transfer(container, resourceType);
                    })
                }
            }
        }
    },
    request: function(makeRequest) {
        for (let name in miners) {
            let miner = miners[name];
            if (miner.paused)
                continue;
            if (!miner.loc)
                continue;
            while (miner.ttl < miner.getDesiredTtl() && unemployed.length) {
                let creep = unemployed.pop();
                console.log(creep.name, "=> miner", miner.id);
                miner.employed++;
                creep.memory.mine = miner.def.id;
            }
            if (miner.ttl < miner.getDesiredTtl()) { 
                let roomName = miner.def.from || Game.flags[miner.def.loc].pos.roomName;
                console.log("miner", miner.def.id, "with", miner.ttl, "of", miner.getDesiredTtl(), "ttl, requesting creep","room:"+roomName);
                makeRequest(roomName, {providing:'energy', creep: {parts:[WORK,WORK,MOVE,CARRY,WORK,MOVE,WORK,MOVE,WORK,MOVE],sector:'miner',max:800}});
            }
        }
    },
    create: function(minerDef) {
        let minerDefs = Memory.miners||{};
        minerDefs[minerDef.id] = minerDef;
        Memory.miners = minerDefs;
    },
    list: function(room) {
        let all = Memory.miners||{};
        for (let name in all) {
            let minerDef = all[name];
            console.log(name, "=>", JSON.stringify(minerDef));
        }
    },
    pause: function(id,pauseFor) {
        let miner = miners[id];
        miner.pause(pauseFor);
        return JSON.stringify(miner.def);
    },
    unpause: function(id) {
        let miner = miners[id];
        miner.unpause();
        return JSON.stringify(miner.def);
    },
};

module.exports = Miners;
