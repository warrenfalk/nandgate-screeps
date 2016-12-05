var Employment = require('employment');

module.exports = {
    isComplete: function(creep) {
        return creep.carry.energy == 0;
    },
    work: function(creep) {
        let memory = creep.memory;
        let findOpts = {
            filter: s =>
                (s.structureType == STRUCTURE_SPAWN || s.structureType == STRUCTURE_EXTENSION)
                && (s.energy < s.energyCapacity),
            ignoreCreeps: true,
        }
        let site = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, findOpts);
        if (!site) {
            delete creep.memory.goal;
            return;
        }
        let result = creep.transfer(site, RESOURCE_ENERGY);
        if (result == ERR_NOT_ENOUGH_RESOURCES || (result == OK && creep.carry.energy == 0)) {
            if (site.structureType == STRUCTURE_SPAWN && creep.ticksToLive < 200)
                site.renewCreep(creep);
            console.log(creep.name + ": " + "empty");
            creep.say("empty");
            delete memory.loc;
            delete memory.goal;
        }
        else if (result == ERR_NOT_IN_RANGE) {
            creep.moveTo(site.pos.x, site.pos.y);
        }
        else {
        }
   },
};