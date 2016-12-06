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
var RoomStats = require('room-stats');
var Tower = require('tower');
var Trap = require('trap');

const sectors = {
    miner: miner,
    ferry: ferry,
    bootstrap: bootstrap,
    reserve: reserve,
    worker: worker,
}

const defaultGoal = 'build';

function findJob(creep, room) {
    if (creep.carry.energy < creep.carryCapacity) {
        return 'harvest'
    }
    else {
        return 'dispense'
    }
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
    let partRatios = specs.parts;
    let sector = specs.sector;
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
    let assembly = parts[TOUGH].concat(parts[CLAIM], parts[HEAL], parts[ATTACK], parts[RANGED_ATTACK], parts[ATTACK], parts[WORK], parts[CARRY], parts[MOVE])
    console.log(JSON.stringify(assembly));
    let mem = {};
    if (sector)
        mem.sector = sector;
    return spawn.createCreep(assembly, mem);
}

function mineWith(creep, xmine, ymine, xrenew, yrenew, mine) {
    if (!creep)
        return;
    if (Game.spawns.Alpha.renewCreep(creep) == OK || creep.ticksToLive < 300) {
        let renewPos = Game.spawns.Alpha.room.getPositionAt(xrenew, yrenew);
        if (creep.room.find(FIND_CREEPS).length > 1)
            creep.moveTo(renewPos)
    }
    else {
        let mineObj = Game.getObjectById(mine);
        let station = xmine instanceof Flag ? xmine.pos : mineObj.room.getPositionAt(xmine, ymine);
        creep.moveTo(station);
        creep.memory.goal = 'manual';
        if (mineObj) {
            creep.harvest(mineObj);
            containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store[RESOURCE_ENERGY] < s.storeCapacity});
            if (containers.length) {
                containers.forEach(container => {
                    creep.transfer(container, RESOURCE_ENERGY);
                })
            }
            else {
                creep.drop(RESOURCE_ENERGY);
            }
        }
    }
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
    for (var name in Game.rooms) {
        let room = Game.rooms[name];
        if (room.isFriendly)
            console.log(room.name,"work parts have/desired",room.work+"/"+getDesiredWorkParts(room));
    }
    
    for (var name in Game.creeps) {
        let creep = Game.creeps[name];
        let room = creep.room;
        let sector = sectors[creep.memory.sector];
        if (sector) {
            continue;
        }
        let goal = creep.newGoal || creep.memory.goal;
        if (goal == 'dispense') {
            goal =
                (room.invaders && room.invaders.length && room.towers.length && room.towerEnergy < 500)
                    ? 'tower'
                    : (room.controller.ticksToDowngrade < 3300)
                        ? 'upgrade'
                        : (creep.room.mySpawns.length && creep.room.energyAvailable < creep.room.energyCapacityAvailable)
                            ? 'supply'
                            : (buildGoal.firstBuildPriority(creep.room))
                                ? 'build'
                                : (creep.room.find(FIND_CONSTRUCTION_SITES).length)
                                    ? 'build'
                                    : 'upgrade';
            console.log(room.name,'assigning', goal);
            if (creep.newGoal)
                creep.newGoal = goal;
            else
                creep.memory.goal = goal;
        }
    }    

    
    for (var name in Game.creeps) {
        let creep = Game.creeps[name];
        let sector = sectors[creep.memory.sector || 'worker'];
        if (sector) {
            sector.employ && sector.employ(creep);
            continue;
        }
    }
    
    for (var name in Game.creeps) {
        let creep = Game.creeps[name];
        if (creep.memory.sector)
            continue;
        let goal = creep.memory.goal;
        switch (creep.memory.goal) {
            case 'harvest':
                harvestGoal.work(creep);
                break;
            case 'supply':
                supplyGoal.work(creep);
                break;
            case 'build':
                buildGoal.work(creep);
                break;
            case 'upgrade':
                upgradeGoal.work(creep);
                break;
            case 'tower':
                towerGoal.work(creep);
                break;
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
        let desiredWork = getDesiredWorkParts(room);
        let buildSize =  Math.max(250, room.energyCapacityAvailable - 300);
        if (room.work < desiredWork) {
            if (room.energyAvailable >= buildSize || room.work == 0) {
                let spawned = createCreep(spawn, Math.min(buildSize, room.energyAvailable), {parts:[WORK,CARRY,MOVE,WORK,CARRY,MOVE,WORK,MOVE,WORK,MOVE,WORK,MOVE,CARRY,MOVE],sector:undefined})
                console.log("Spawned worker", spawned);
            }
            continue;
        }
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
    
    //mineWith(Game.creeps.Kylie, 14, 34, 27, 27, '57ef9d6c86f108ae6e60dbdd');
    //mineWith(Game.creeps.Abigail, 42, 33, 29, 27, '57ef9d6c86f108ae6e60dbdc');
    //mineWith(Game.creeps.Kylie, Game.flags.Mine, null, 27, 27, '57ef9d6c86f108ae6e60dbda');

    
    creep = Game.creeps.Julia;
    //creep.moveTo(34,20)
    let [ target, action ] =
        // transfer to spawn
        [Game.spawns.Beta, (creep, target) => creep.transfer(target, RESOURCE_ENERGY)];
        // container1
        //[Game.getObjectById('5832539aa617dc852ec3c194'), (creep, target) => creep.withdraw(target, RESOURCE_ENERGY)];
        // storage withdraw
        //[Game.getObjectById('58350e6e0a19c9fa133c8ca8'), (creep, target) => creep.withdraw(target, RESOURCE_ENERGY)];
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