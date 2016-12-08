"use strict";
module.exports = function (creep) {
    if (creep.ticksToLive < 200 || creep.memory.renew) {
        let spawns = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {filter: s => s.structureType === STRUCTURE_SPAWN});
        if (!spawns.length) {
            creep.say("renew");
            let spawn = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN});
            if (spawn)
                creep.moveTo(spawn.pos.x, spawn.pos.y);
            else
                creep.moveTo(Game.spawns.Alpha.pos);
        }
        else {
            if (OK == spawns[0].renewCreep(creep) && creep.ticksToLive < 1000)
                creep.memory.renew = true;
            else
                delete creep.memory.renew;
        }
        return true;
    }
    return false;
};
