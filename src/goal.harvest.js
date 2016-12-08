"use strict";
const _ = require('lodash');

const storageFilter = s => ((s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store[RESOURCE_ENERGY] > 0)
            || ((s.structureType === STRUCTURE_LINK) && s.energy > 0);

module.exports = {
    isComplete: function(creep) {
        return _.sum(creep.carry) == creep.carryCapacity;
    },
    work: function(creep) {
        if (creep.spawning)
            return;
        let memory = creep.memory;

        let source;
        let sources;
        sources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1, {filter: r => r.resourceType == RESOURCE_ENERGY})
        if (sources.length) {
            let dropped = sources[0];
            if (OK == creep.pickup(dropped))
                return;
        }
        sources = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter: s => (s.structureType === STRUCTURE_LINK) && s.energy > 0})
        if (sources.length) {
            let link = sources[0];
            if (OK === creep.withdraw(link, RESOURCE_ENERGY))
                return;
        }
        sources = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter: s => (s.structureType === STRUCTURE_CONTAINER) && s.store.energy > 0})
        if (sources.length) {
            let container = sources[0];
            if (OK === creep.withdraw(container, RESOURCE_ENERGY))
                return;
        }
        sources = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter: s => (s.structureType === STRUCTURE_STORAGE) && s.store.energy > 0})
        if (sources.length) {
            let storage = sources[0];
            if (OK === creep.withdraw(storage, RESOURCE_ENERGY))
                return;
        }
        // nothing in range, let's travel
        let closestStorage = creep.pos.findClosestByRange(FIND_STRUCTURES, {filter: storageFilter});
        let closestResource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {filter: r => r.resourceType == RESOURCE_ENERGY});
        let closestSource = creep.pos.findClosestByRange(FIND_SOURCES, {filter: s => s.energy > 0});
        source = creep.pos.findClosestByRange([closestStorage, closestResource, closestSource], {filter: x => x});
        if (source == null) {
            console.log(creep.room.name, "No energy available");
        }
        else if (source instanceof Source) {
            let result = creep.harvest(source);
            if (result == OK || creep.carry.energy == creep.carryCapacity) {
                delete memory.loc;
            }
            else if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source);
            }
        }
        else if (source instanceof Resource) {
            let result = creep.pickup(source);
            if (result == OK || creep.carry.energy == creep.carryCapacity) {
                delete memory.loc;
            }
            else if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source.pos.x, source.pos.y);
            }
        }
        else if (source instanceof StructureContainer || source instanceof StructureStorage || source instanceof StructureLink) {
            let result = creep.withdraw(source, RESOURCE_ENERGY);
            if (result == OK || creep.carry.energy == creep.carryCapacity) {
                // TODO: this repair doesn't seem to work, probably because we're usually empty at this tick
                // so we probably need to find a way to signal a worker to repair occasionally
                creep.repair(source);
                delete memory.loc;
            }
            else if (result == ERR_NOT_IN_RANGE) {
                creep.moveTo(source.pos.x, source.pos.y);
            }
            else {
                console.log("container harvest error", result);
            }
        }
        else {
            console.log("What is source", source);
        }
    },
};
