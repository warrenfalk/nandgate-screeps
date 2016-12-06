var harvestGoal = require('goal.harvest');
var buildGoal = require('goal.build');
var supplyGoal = require('goal.supply');
var upgradeGoal = require('goal.upgrade');
var towerGoal = require('goal.tower');
var Employment = require('employment');
var ferry = require('ferry');
var miner = require('miner');
var bootstrap = require('bootstrap');
var reserve = require('reserve');
var worker = require('worker');
var scout = require('scout');
var RoomStats = require('room-stats');
var Tower = require('tower');
var Trap = require('trap');

// The order, here, is currently important
// this is the order these are processed
// which means this is also the priority for creep request fulfillment
const sectors = {
    worker: worker,
    miner: miner,
    ferry: ferry,
    bootstrap: bootstrap,
    reserve: reserve,
    scout: scout,
}

let partCost = {
    [MOVE]: 50,
    [WORK]: 100,
    [CARRY]: 50,
    [ATTACK]: 80,
    [RANGED_ATTACK]: 150,
    [HEAL]: 250,
    [CLAIM]: 600,
    [TOUGH]: 10,
};

function createCreep(spawn, energy, specs) {
    if (specs && specs.max && specs.max < energy)
        energy = specs.max;
    if (energy > spawn.room.energyAvailable)
        energy = spawn.room.energyAvailable;
    let assembly = specs.assembly;
    if (!assembly) {
        let partRatios = specs.parts;
        let parts = {
            [MOVE]: [],
            [WORK]: [],
            [CARRY]: [],
            [ATTACK]: [],
            [RANGED_ATTACK]: [],
            [HEAL]: [],
            [CLAIM]: [],
            [TOUGH]: [],
        }
        while (energy > 0) {
            for (let i = 0; i < partRatios.length; i++) {
                let partType = partRatios[i];
                let cost = partCost[partType];
                energy -= cost;
                if (energy < 0)
                    break;
                parts[partType].push(partType);
            }
        }
        assembly = parts[TOUGH].concat(parts[CLAIM], parts[HEAL], parts[ATTACK], parts[RANGED_ATTACK], parts[ATTACK], parts[WORK], parts[CARRY], parts[MOVE])
    }
    console.log(JSON.stringify(assembly));
    let mem = {};
    if (specs.sector)
        mem.sector = specs.sector;
    return spawn.createCreep(assembly, mem);
}

module.exports.loop = function () {
    console.log("----- (testing grunt)");
    global.build = (id) => buildGoal.addBuildPriority(room, id);
    
    // Collect stats on all the rooms
    RoomStats.run();

    // Initialize all creep sectors
    for (let sectorName in sectors) {
        let sector = sectors[sectorName];
        sector.init && sector.init();
    }

    // Run every sector
    for (var name in Game.rooms) {
        let room = Game.rooms[name];
        Tower.run(room);
        for (let sectorName in sectors) {
            let sector = sectors[sectorName];
            sector.run && sector.run(room);
        }
    }

    Trap.run(Game.flags.Trap1);
    
    // find out whose goals completed this round
    // assign to them a provisional new job
    for (var name in Game.creeps) {
        let creep = Game.creeps[name];
        let sector = sectors[creep.memory.sector || 'worker'];
        if (sector) {
            sector.stats(creep);
            continue;
        }
    }
    
    for (var name in sectors) {
        let sector = sectors[name];
        if (sector.request) {
            sector.request((roomName, request) => {
                let providing = request.providing;
                let room = Game.rooms[roomName];
                if (!room) {
                    console.log("Warning, room",roomName,"not found, cannot create creep");
                    return;
                }
                room.creepRequests.push(request.creep);
            })
        }
    }
    
    // calculate the total stored energy
    // base the number of desired work parts based on the total stored energy
    // so that with fewer workers to carry away and use energy, the storage builds up causing more workers until equilibrium is reached
    let getDesiredWorkParts = (room) => 5 + Math.ceil(room.storedEnergy * 0.002);
    
    for (var name in Game.creeps) {
        let creep = Game.creeps[name];
        let sector = sectors[creep.memory.sector || 'worker'];
        if (sector) {
            sector.employ && sector.employ(creep);
            continue;
        }
    }
    
    for (let name in Game.rooms) {
        let room = Game.rooms[name];
        let spawn = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN})[0];
        if (!spawn)
            continue;
        if (spawn.spawning)
            continue;
        //continue;
        let creepRequests = room.creepRequests;
        let buildSize =  Math.max(250, room.energyCapacityAvailable - 300);
        if (room.memory.creepRequests && room.memory.creepRequests.length) {
            let request = room.memory.creepRequests.pop();
            let spawned = createCreep(spawn, buildSize, request);
            console.log("Spawned manual", spawned);
            continue;
        }
        if (creepRequests.length) {
            let spawned = createCreep(spawn, buildSize, creepRequests[0]);
            console.log("Spawned requested", spawned);
            continue;
        }
    }
    
    var link = Game.getObjectById('583776f3c176db8754bf76cb');
    var storage = Game.getObjectById('58350e6e0a19c9fa133c8ca8');
    if (link && storage) {
        if (link.energy)
            link.transferEnergy(storage);
        if (link.energy == 0) {
            let others = link.room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_LINK && s.energy == s.energyCapacity});
            others.forEach(other => other.transferEnergy(link));
        }
    }
    
    creep = null;//Game.creeps.Molly;
    //creep.moveTo(34,20)
    let [ target, action ] =
        // go to flag
        //[Game.flags.Steal, (creep, target) => 1];
        // transfer to spawn
        //[Game.spawns.Beta, (creep, target) => creep.transfer(target, RESOURCE_ENERGY)];
        // container1
        //[Game.getObjectById('5832539aa617dc852ec3c194'), (creep, target) => creep.withdraw(target, RESOURCE_ENERGY)];
        // withdraw energy
        [Game.getObjectById('58337ecd8c86a0e61a1a4f42'), (creep, target) => creep.withdraw(target, RESOURCE_ENERGY)];
        // extension 4
        //[Game.getObjectById('583207c551ac170e71ce1a0d'), (creep, target) => creep.transfer(target, RESOURCE_ENERGY)];
        // extension 3
        //[Game.getObjectById('583203a0056d469b5a7fac16'), (creep, target) => creep.transfer(target, RESOURCE_ENERGY)];
        // extension 5
        //[Game.getObjectById('5831f2c241c198597758f198'), (creep, target) => creep.transfer(target, RESOURCE_ENERGY)];
        // recycle creep
        //[Game.spawns.Alpha, (creep, target) => { result = target.recycleCreep(creep); console.log("result", result); }];
        // claim controller
        //[Game.getObjectById('57ef9d6c86f108ae6e60dbd9'), (creep, target) => creep.claimController(target)];
        // reserve controller
        //[Game.getObjectById('57ef9d6986f108ae6e60db94'), (creep, target) => creep.reserveController(target)];
        //[Game.flags.M3, (creep, target) => creep.transfer(target, RESOURCE_ENERGY)];
        // build target
        //[Game.getObjectById('583b1132445866cb4ace3b21'), (creep, target) => { creep.pickup(creep.pos.findInRange(FIND_DROPPED_RESOURCES,1)[0]); return creep.build(target) }]

    if (creep && action(creep, target) !== OK)
        creep.moveTo(target);

    if (creep && action(creep, target) !== OK)
        creep.moveTo(target);

    //*/
    /*
    let target =
        //Game.spawns.Alpha;
        //Game.getObjectById('583380dd365b13b4127cbbde'); // extractor
        //Game.getObjectById('58337b377680b4317dcdedb0'); // extractor
        Game.getObjectById('5832539aa617dc852ec3c194'); // container
    //if (creep.transfer(target, RESOURCE_ENERGY) !== OK)
    //if (target.renewCreep(creep) !== OK)
    if (creep.withdraw(target) !== OK)
        creep.moveTo(target.pos)
    */

    //Game.creeps.Gen1.moveTo(Game.creeps.Gen1.pos.findClosestByRange(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN}))
}