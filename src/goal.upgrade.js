"use strict";

module.exports = {
    isComplete: function(creep) {
        return creep.carry.energy == 0;
    },
    work: function(creep) {
        let towers = creep.pos.findInRange(FIND_MY_STRUCTURES, 1, {filter: s => s.structureType == STRUCTURE_TOWER && s.energy < s.energyCapacity});
        if (towers.length) {
            let amount = towers[0].energyCapacity - towers[0].energy;
            amount = Math.min(amount, creep.carry.energy);
            if (OK == creep.transfer(towers[0], RESOURCE_ENERGY, amount) && amount >= creep.carry.energy)
                return;
        }
        let site = creep.room.controller;
        let result = creep.upgradeController(site);
        if (result == ERR_NOT_IN_RANGE) {
            let roads = creep.pos.findInRange(FIND_STRUCTURES, 3, {filter: s => s.structureType === STRUCTURE_ROAD && s.hits < 1000})
            roads.forEach(road => {
                creep.repair(road);
            })
            creep.moveTo(site, {range: 3});
        }
    },
};
