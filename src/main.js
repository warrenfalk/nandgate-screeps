"use strict";
var buildGoal = require('goal.build');
var ferry = require('ferry');
var miner = require('miner');
var bootstrap = require('bootstrap');
var reserve = require('reserve');
var worker = require('worker');
var scout = require('scout');
var quarry = require('quarry');
var supply = require('supply');
var terminator = require('terminator');
var RoomStats = require('room-stats');
var Tower = require('tower');
var Trap = require('trap');

// The order, here, is currently important
// this is the order these are processed
// which means this is also the priority for creep request fulfillment
const sectors = {
    terminator: terminator,
    worker: worker,
    miner: miner,
    ferry: ferry,
    bootstrap: bootstrap,
    scout: scout,
    quarry: quarry,
    supply: supply,
    reserve: reserve,
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

function createCreep(spawn, reqEnergy, specs) {
    let energy = reqEnergy;
    if (specs && specs.max && specs.max < energy)
        energy = specs.max;
    if (energy > spawn.room.energyAvailable)
        energy = spawn.room.energyAvailable;
    let budget = energy;
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
        assembly = parts[TOUGH].concat(parts[CLAIM], parts[HEAL], parts[ATTACK], parts[RANGED_ATTACK], parts[WORK], parts[CARRY], parts[MOVE])
    }
    console.log(budget, JSON.stringify(assembly));
    let mem = specs.memory || {};
    if (specs.sector)
        mem.sector = specs.sector;
    return spawn.createCreep(assembly, mem);
}

module.exports.loop = function () {
    console.log("----- (testing grunt)");
    global.build = (id) => buildGoal.addBuildPriority(Game.getObjectById('id').room, id);

    // Collect stats on all the rooms
    RoomStats.run();

    // Initialize all creep sectors
    for (let sectorName in sectors) {
        let sector = sectors[sectorName];
        sector.init && sector.init();
    }

    // Run every sector
    for (let roomName in Game.rooms) {
        let room = Game.rooms[roomName];
        Tower.run(room);
        for (let sectorName in sectors) {
            let sector = sectors[sectorName];
            sector.run && sector.run(room);
        }
    }

    Trap.run(Game.flags.Trap1);

    // find out whose goals completed this round
    // assign to them a provisional new job
    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        let sector = sectors[creep.memory.sector || 'worker'];
        sector && sector.stats && sector.stats(creep);
    }
    
    for (let sectorName in sectors) {
        let sector = sectors[sectorName];
        if (sector.request) {
            sector.request((roomName, request) => {
                let room = Game.rooms[roomName];
                if (!room) {
                    console.log("Warning, room",roomName,"not found, cannot create creep");
                    return;
                }
                room.creepRequests.push(request.creep);
            })
        }
    }

    for (let creepName in Game.creeps) {
        let creep = Game.creeps[creepName];
        let sector = sectors[creep.memory.sector || 'worker'];
        if (sector) {
            sector.employ && sector.employ(creep);
            continue;
        }
    }

    for (let sectorName in sectors) {
        let sector = sectors[sectorName];
        sector.resolve && sector.resolve();
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
            let request = room.memory.creepRequests[0];
            if (room.energyAvailable >= Math.min(buildSize, (request.max||buildSize))) {
                let request = room.memory.creepRequests.pop();
                let spawned = createCreep(spawn, buildSize, request);
                console.log("Spawned manual", spawned);
            }
            continue;
        }
        let request = creepRequests && creepRequests[0];
        if (request && room.energyAvailable >= Math.min(buildSize, request.max||buildSize, request.threshold||buildSize)) {
            let spawned = createCreep(spawn, buildSize, request);
            console.log("Spawned requested", spawned);
            continue;
        }
    }

    /*
    let link = Game.getObjectById('583776f3c176db8754bf76cb');
    let storage = Game.getObjectById('58350e6e0a19c9fa133c8ca8');
    if (link && storage) {
        if (link.energy)
            link.transferEnergy(storage);
        if (link.energy == 0) {
            let others = link.room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_LINK && s.energy == s.energyCapacity});
            others.forEach(other => other.transferEnergy(link));
        }
    }
    */

    const link = Game.getObjectById('5849b522fa8ba91d3d47be0c');
    const storage  = Game.getObjectById('58350e6e0a19c9fa133c8ca8');

    let creep = Game.creeps.Hailey;
    //creep.moveTo(34,20)
    let [ target, action ] =
        // go to flag
        //[Game.flags.Steal, (creep, target) => 1];
        // transfer to spawn
        //[Game.spawns.Beta, (creep, target) => creep.transfer(target, RESOURCE_ENERGY)];
        // container1
        //[Game.getObjectById('5832539aa617dc852ec3c194'), (creep, target) => creep.withdraw(target, RESOURCE_ENERGY)];
        // withdraw energy
        //[Game.getObjectById('58337ecd8c86a0e61a1a4f42'), (creep, target) => creep.withdraw(target, RESOURCE_ENERGY)];
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
        // enemy
        [Game.getObjectById('5849ffc3122d12e02d34c9fc') || new RoomPosition(26, 26, 'W24S69'), (creep, target) => creep.attack(target)];
        //
        //[new RoomPosition(14, 32, 'W23S69'), (creep, target) => { creep.withdraw(link, RESOURCE_ENERGY); creep.transfer(storage, RESOURCE_ENERGY); }]

    if (creep && action(creep, target) !== OK)
        creep.moveTo(target);
        
    let creep2 = Game.creeps.Charlie;
    creep2.moveTo(new RoomPosition(26, 26, 'W24S69'));
    

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
