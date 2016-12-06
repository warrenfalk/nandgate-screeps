/*
 * Gather room stats during main loop
 */

const isStorage = s => (s.my && s.structureType === STRUCTURE_STORAGE) || s.structureType === STRUCTURE_CONTAINER;

function getStats(room) {
    room.invaders = room.find(FIND_HOSTILE_CREEPS);
    room.mySpawns = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_SPAWN});
    room.towers = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_TOWER});
    room.towerEnergy = room.towers.reduce((total,tower) => total + tower.energy, 0);
    room.hasWorkingTower = room.towers.some(t => t.energy > 0)
    room.stores = room.find(FIND_STRUCTURES, {filter: s => isStorage(s)});
    room.storedEnergy = room.stores.reduce((total,s) => total + s.store[RESOURCE_ENERGY], 0);
    room.isFriendly = room.mySpawns.length > 0;
    // create queues
    room.creepRequests = [];
    
    // initialize some aggregate numbers for the generic workers
    // we should remove these when we build workers as its own sector
    room.work = 0;
}

function calcCreepStats(creep) {
    let room = creep.room;
}

module.exports = {
    run: function() {
        for (var name in Game.rooms) {
            let room = Game.rooms[name];
            getStats(room);
        }
        for (var name in Game.creeps) {
            let creep = Game.creeps[name];
            calcCreepStats(creep);
        }
    },
};