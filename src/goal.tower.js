"use strict";

module.exports = {
    isComplete: function(creep) {
        return creep.carry.energy == 0;
    },
    work: function(creep) {
        let towers = creep.pos.findInRange(FIND_MY_STRUCTURES, 13, {filter: s => s.structureType == STRUCTURE_TOWER && s.energy < 300});
        if (towers.length) {
            let result = creep.transfer(towers[0], RESOURCE_ENERGY);
            if (result == OK)
                return;
            else if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(towers[0]);
                return;
            }
        }
    },
};
