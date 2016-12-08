"use strict";
// Supply sector has two goals
// 1. Answer requests for energy at places in the room and get energy there
// 2. Make sure excess energy gets stored
// Do these as efficiently as possible, storing energy where it is needed most

const _ = require('lodash');

const Supply = {
    init: function() {

    },
    run: function(room) {
        // find the storage in the room
        let storages = room.find(FIND_STRUCTURES, s => s.structureType == STRUCTURE_STORAGE);
        let storage = storages && storages[0];
        if (!storage)
            return;
        // find the link nearest the storage
        let storageLink = storage.pos.findClosestByRange(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_LINK});
        let otherLinks = room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_LINK && s !== storageLink});
        otherLinks.forEach(link => {
            console.log("link", link);
            link.transferEnergy(storageLink);
        })
    },
    stats: function(creep) {

    },
    employ: function(creep) {

    },
    request: function(makeRequest) {

    },
}

module.exports = Supply;
