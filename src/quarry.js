"use strict";
/*
A quarry is a system for distant mining

It is a miner who sits on the mine
Carriers who ferry the energy
And a builder who builds and maintains a road



A miner can mine 2 E per WORK per tick
A source regnerates to 3000 E per 300 ticks
*/



const _ = require('lodash');
const getDirection = require('getDirection');
const findClosestSpawnRoom = require('findClosestSpawnRoom');

// this returns an element of an array given an index and a length such that an ever-increasing index results in a sawtooth access pattern on the array
// meaning that with a length of 3 and indexes of 0, 1, 2, 3, 4, 5, 6, 7,...
// this function will return 0, 1, 2, 1, 0, 1, 2, 1,...
const sawtooth = (index, length) => length - (1 + Math.abs(((Math.abs(index) - 1) % ((length * 2) - 2)) - (length - 2)))

function fire(creep) {
    delete creep.memory.quarry.name;
}

function findBuildPositionFor(targetPosition, avoid) {
    let room = Game.rooms[targetPosition.roomName];
    let avoidSet = {};
    avoid.forEach(pos => {
        if (pos.roomName && pos.roomName !== room.name)
            return;
        let avoidKey = pos.y+","+pos.x;
        avoidSet[avoidKey] = true;
    })
    let spots = [];
    for (let i = 1; i < 4; i++) {
        let top = Math.max(targetPosition.y - 1, 1);
        let bottom = Math.min(targetPosition.y + 1, 48);
        let left = Math.max(targetPosition.x - 1, 1);
        let right = Math.min(targetPosition.x + 1, 48);
        let area = room.lookAtArea(top, left, bottom, right);
        for (let y in area) {
            let row = area[y];
            for (let x in row) {
                let avoidKey = y+","+x;
                if (avoidSet[avoidKey])
                    continue;
                if (row[x].some(f => f.terrain === 'wall' || f.type === 'structure' || f.type === 'creep'))
                    continue;
                let spot = {
                    x: x,
                    y: y,
                    features: row[x],
                }
                spots.push(spot);
            }
        }
        let spot = spots.find(s => s.features.some(f => f.terrain === 'normal'));
        if (spot)
            return new RoomPosition(spot.x, spot.y, room.name);
        spot = spots[0];
        if (spot)
            return new RoomPosition(spot.x, spot.y, room.name);
    }
}
global.findBuildPositionFor = findBuildPositionFor;

const WORK_RATE = 2;
const CARRY_RATE = 50;
const RNDTRIP_FACTOR = 0.5;
const CARRY_EFFICIENCY = 0.85; // the carry efficiency we expect

function Quarry(flag) {
    this.flag = flag;
    this.carriers = [];
    if (!Memory.quarry)
        Memory.quarry = {};
    if (!Memory.quarry[flag.name])
        Memory.quarry[flag.name] = {};
    let memory = Memory.quarry[flag.name];

    let path = memory.path;
    if (!path || !path.time || (Game.time - path.time) > 1000) {
        let newPath = this.findPath();
        if (newPath && newPath.path && newPath.path.length) {
            console.log("Refreshed path for",this.flag.name);
            memory.path = newPath
        }
    }
    let drop = path[path.length - 1];

    this.memory = memory;
    this.path = path;
    this.drop = drop;
}
Quarry.prototype.pause = function(pauseTime) {
    if (pauseTime) {
        this.memory.pauseUntil = Game.time + pauseTime;
        delete this.memory.paused;
    }
    else {
        this.memory.paused = true;
        delete this.memory.pauseUntil;
    }
}
Quarry.prototype.isPaused = function() {
    return this.memory.paused || (this.memory.pauseUntil && (this.memory.pauseUntil > Game.time))
}
Quarry.prototype.calcDesiredCarryParts = function() {
    // A miner can mine 2 energy per tick per WORK part
    // A carry part can move 50 energy one square per work part
    // But it has to go back so it can effectively do only 25
    // And we want some cushion, so we'll pretend it can do only 85% efficiency
    // So for every work part given a distance of 10 we need one CARRY
    // given a distance of 20, we'd need two CARRYs per work part
    if (!this.miner)
        return 0;
    let workParts = this.miner.getActiveBodyparts(WORK);
    let energyRate = workParts * WORK_RATE;
    let carryRate = CARRY_RATE * CARRY_EFFICIENCY * RNDTRIP_FACTOR; // 21.25
    let distance = this.path.path.length;
    let energyPerCarry = carryRate / distance; // how many energy a CARRY part can carry on this path
    let neededCarryParts = energyRate / energyPerCarry
    return Math.ceil(neededCarryParts);
}
Quarry.prototype.stats = function(creep) {
    const q = creep.memory.quarry;
    const role = q.role;
    switch (role) {
        case 'miner':
            if (this.miner)
                fire(creep);
            else
                this.miner = creep;
            break;
        case 'carrier':
            this.carriers.push(creep);
            break;
        case 'construct':
            if (this.construct)
                fire(creep);
            else
                this.construct = creep;
            break;
    }
}
Quarry.prototype.employ = function(creep) {
    const q = creep.memory.quarry;
    const role = q.role;
    switch (role) {
        case 'miner':
            this.employMiner(creep);
            break;
        case 'carrier':
            this.employCarrier(creep);
            break;
        case 'construct':
            this.employConstructor(creep);
            break;
    }
}
Quarry.prototype.employMiner = function(creep) {
    if (creep.pos.getRangeTo(this.flag) != 0) {
        creep.moveTo(this.flag);
        return;
    }
    let sources = creep.pos.findInRange(FIND_SOURCES, 1, {filter: s => s.energy > 0});
    let source = sources && sources[0];
    if (source) {
        creep.harvest(source);
    }
    else {
        let minerals = creep.pos.findInRange(FIND_MINERALS, 1);
        let mineral = minerals && minerals[0];
        if (mineral) {
            let result = creep.harvest(mineral);
            if (result !== OK && result !== ERR_TIRED)
                console.log("harvest mineral",result);
        }
    }
}
Quarry.prototype.employCarrier = function(creep) {
    // TODO: implement carriers, look at how ferry works for inspiration, maybe
    // make sure this also works such that carriers stay on their path and relay to each other
    // and also supply the constructor

    // a carrier is in one of two basic modes
    // it's either carrying energy back to base
    // or it is returning to refill
    // if it has energy then it is carrying it back to base
    // if along the way it meets another carrier for its mine which is empty
    // it transfers its contents to that carrier (and then immediately turns around)
    let m = creep.memory.quarry;
    let quarry = quarryTeams[m.name];
    if (!quarry) {
        fire(creep);
        return;
    }
    // the rest of this will be coordinated in the "resolve" action
}
Quarry.prototype.pathIndexOf = function(pos) {
    let path = this.path.path;
    let length = path.length;
    for (let i = 0; i < length; i++) {
        let spot = path[i];
        if (pos.x === spot.x && pos.y == spot.y && pos.roomName == spot.roomName)
            return i;
    }
    return -1;
}
Quarry.prototype.resolveCarriers = function() {

}
Quarry.prototype.load = function(creep) {
    let resources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
    let resource = resources && resources[0];
    if (resource) {
        creep.pickup(resource);
    }
    else {
        if (this.miner && creep.pos.getRangeTo(this.miner))
            this.miner.transfer(creep, RESOURCE_ENERGY);
    }
}
Quarry.prototype.advanceConstructor = function(creep) {
    let m = creep.memory.quarry;
    let path = this.path.path;
    m.index = (m.index|0) + 1;
    m.tries = 0;
    let newSpot = path[sawtooth(m.index, path.length)];
    let newLoc = new RoomPosition(newSpot.x, newSpot.y, newSpot.roomName);
    creep.moveTo(newLoc);
}
Quarry.prototype.employConstructor = function(creep) {
    let carry = creep.carry.energy;
    let loadDistance = creep.pos.getRangeTo(this.flag.pos);
    if (carry === 0) {
        if (loadDistance > 1) {
            creep.moveTo(this.flag.pos, {range: 1})
        }
        else {
            this.load(creep);
        }
    }
    else {
        if (loadDistance <= 1 && carry < creep.carryCapacity)
            this.load(creep);
        // I have energy, so I should be crawling the path
        let path = this.path.path;
        if (path.length == 0) {
            console.log("Quarry constructor can't determine path for", this.flag.name);
            // this must mean we don't currently have access to this room, so we shouldn't have a constructor
            // let another quarry take this constructor
            delete creep.memory.quarry.name;
            return;
        }
        let m = creep.memory.quarry;
        if (!m.index)
            m.index = 0;
        let road, loc;
        for (;;) {
            let pathIndex = sawtooth(m.index, path.length);
            let spot = path[pathIndex];
            if (pathIndex >= (path.length - 1))
                m.complete = true;
            loc = new RoomPosition(spot.x, spot.y, spot.roomName);
            let contents = Game.rooms[loc.roomName].lookAt(loc.x, loc.y);
            road = contents.find(s => (s.type === "structure" && s.structure.structureType === STRUCTURE_ROAD) || (s.type === "constructionSite" && s.constructionSite.structureType === STRUCTURE_ROAD))
            if (!road) {
                //creep.say('NR');
                // if there is no road, there, start the road
                let result = Game.rooms[loc.roomName].createConstructionSite(loc.x, loc.y, STRUCTURE_ROAD);
                if (result === ERR_INVALID_TARGET)
                    this.advanceConstructor(creep);
                continue;
            }
            break;
        }
        if (creep.pos.getRangeTo(loc) > 3 || creep.pos.roomName != loc.roomName) {
            //creep.say('MV');
            creep.moveTo(loc);
            return;
        }

        if (road.type === "constructionSite") {
            //creep.say('CS');
            // if it is still a construction site, start building it
            let position = findBuildPositionFor(loc, path) || loc;
            if (creep.pos.getRangeTo(position) > 0)
                creep.moveTo(position);
            creep.build(road.constructionSite);
        }
        else {
            // there is a road at the current loction
            let maxRepair = Math.min(creep.getActiveBodyparts(WORK) * 100, creep.carry.energy * 100);
            let needRepair = road.structure.hitsMax - road.structure.hits;
            //console.log(creep.name, "max repair", maxRepair, "need", needRepair, JSON.stringify(road.structure.pos));
            if (needRepair > 0 && needRepair <= maxRepair) {
                // the road needs trivial repair
                if (OK === creep.repair(road.structure))
                    this.advanceConstructor(creep);
                //creep.say('RT');
            }
            else if (needRepair > maxRepair) {
                // the road needs prolonged repair
                // find a place on the map nearby but not on the road
                // (make sure it is in the same room)
                // because we might be a while
                let position = findBuildPositionFor(road.structure.pos, path) || road.structure.pos;
                if (creep.pos.getRangeTo(position) > 0)
                    creep.moveTo(position);
                creep.repair(road.structure);
                //creep.say('RL');
            }
            else {
                //creep.say('R.');
                // the road is there and everything is good
                let distance = creep.pos.getRangeTo(loc);
                if (distance > 0 && m.tries < 3) {
                    m.tries = (m.tries||0) + 1;
                    // we should be on that square
                    creep.moveTo(loc);
                }
                else {
                    // we're on that square, so now advance and go ahead and move to the new square
                    this.advanceConstructor(creep);
                }
            }
        }
    }
}
Quarry.prototype.findPath = function() {
    let origin = this.findOrigin();
    let originRoom = Game.rooms[origin];
    // find links and storages
    let candidates = originRoom.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_LINK || s.structureType === STRUCTURE_STORAGE})
    // get within 1 square
    candidates = candidates.map(o => ({pos: o.pos, range: 1}));
    // find path to closest
    let pathData = PathFinder.search(this.flag.pos, candidates, {
        plainCost: 2,
        swampCost: 3, // we're going to build road over this eventually, so mostly just go shortest path, but roads over swamps cost more
        roomCallback: function(roomName) {
            let room = Game.rooms[roomName];
            if (!room)
                return false;
            let costs = new PathFinder.CostMatrix;
            room.find(FIND_STRUCTURES).forEach(s => {
                if (s.structureType === STRUCTURE_ROAD)
                    costs.set(s.pos.x, s.pos.y, 1);
                else if (!(s.structureType === STRUCTURE_CONTAINER || (s.structureType === STRUCTURE_RAMPART && s.my)))
                    costs.set(s.pos.x, s.pos.y, 0xff);
            })
            room.find(FIND_CONSTRUCTION_SITES, {filter: c => c.structureType === STRUCTURE_ROAD}).forEach(c => {
                costs.set(c.pos.x, c.pos.y, 1); // make sure we put path through existing construciton sites
            })
            return costs;
        },
    })
    let path = {path: pathData.path, time: Game.time};
    return path;
}
Quarry.prototype.findOrigin = function() {
    return findClosestSpawnRoom(this.flag.pos);
}
Quarry.prototype.balance = function() {
    // if the constructor has no carry, then swap them
    if (this.construct.getActiveBodyparts(CARRY) == 0)
        this.swap();
    // the one with the closest to 5 work parts should be the miner
    if (Math.abs(5 - this.miner.getActiveBodyparts(WORK)) > Math.abs(5 - this.construct.getActiveBodyparts(WORK)) && this.miner.getActiveBodyparts(CARRY) > 0)
        this.swap();
}
Quarry.prototype.swap = function() {
    const t = this.construct;
    this.construct = this.miner;
    this.miner = t;
}

let quarryTeams;
let unemployed;

const QuarrySector = {
    init: function() {
        unemployed = {
            miner: [],
            carrier: [],
            construct: [],
        };
        quarryTeams = {};
        for (let name in Game.flags) {
            let flag = Game.flags[name];
            if (flag.color !== COLOR_PURPLE)
                continue;
            if (!/Quarry:/.test(flag.name))
                continue;
            quarryTeams[name] = new Quarry(flag);
        }
    },
    run: function(room) {

    },
    stats: function(creep) {
        const q = creep.memory.quarry;
        if (!q) {
            console.log("What to do about quarry sector with no quarry data?");
            delete creep.memory.sector;
            return;
        }
        let name = q.name;
        if (!name) {
            unemployed[q.role].push(creep);
            return;
        }
        let quarry = quarryTeams[q.name];
        if (!quarry) {
            delete creep.memory.quarry.name;
            return;
        }
        quarry.stats(creep);
    },
    employ: function(creep) {
        const q = creep.memory.quarry;
        let name = q.name;
        if (!name)
            return;
        let quarry = quarryTeams[name];
        if (quarry.flag.room && !quarry.flag.room.isFriendly && creep.room.invaders.some(i => i.getActiveBodyparts(ATTACK) || i.getActiveBodyparts(RANGED_ATTACK))) {
            let invaderTtl = creep.room.invaders.reduce((ttl,invader) => ttl + (invader.ticksToLive||0), 0) || 1501;
            if (!quarry.isPaused()) {
                quarry.pause(invaderTtl);
                Game.notify("invader detected, pausing "+quarry.flag.name+" for "+invaderTtl, 0);
            }
        }

        quarry.employ(creep);
    },
    resolve: function() {
        let creeps = [];
        let positions = {};
        for (let quarryName in quarryTeams) {
            const quarry = quarryTeams[quarryName];

            // build an array of carriers on the path
            quarry.carriers.forEach(creep => {
                // TODO: optimize by remembering last path index and starting from there
                creep.quarry = quarry;
                let pi = quarry.pathIndexOf(creep.pos);
                creep.pathIndex = pi;
                if (pi < 0) {
                    // attempt to move to source, we'll probably hit the path along the way, but we'll eventually get there
                    let p = quarry.path.path[0];
                    creep.moveTo(new RoomPosition(p.x, p.y, p.roomName));
                }
                else {
                    let positionId = creep.pos.x + "." + creep.pos.y + "." + creep.pos.roomName;
                    positions[positionId] = creep;
                    creeps.push(creep);
                }
            })
        }

        // first try to transfer all energy downstream
        creeps.forEach(creep => {
            let carry = creep.carry.energy;
            let pathIndex = creep.pathIndex;
            let path = creep.quarry.path.path;
            if (carry > 0) {
                let cx = creep.quarry.construct;
                let cxcap = cx && ((cx.carry.energy + (cx.credit||0)) < cx.carryCapacity);
                if (cxcap && creep.pos.getRangeTo(cx) <= 1) {
                    let amount = Math.min(carry, cxcap)
                    if (OK === creep.transfer(cx, RESOURCE_ENERGY, amount))
                        cx.credit = (cx.credit||0) + amount;
                }
                else if (pathIndex < (path.length - 1)) {
                    // not at end, see where we should move next
                    let d = path[pathIndex + 1];
                    let dest = new RoomPosition(d.x, d.y, d.roomName);
                    // if there is already a carrier there, give him our stuff
                    let positionId = dest.x + '.' + dest.y + '.' + dest.roomName
                    let dcreep = positions[positionId]
                    let capacity = dcreep && (dcreep.carryCapacity - dcreep.carry.energy)
                    console.log(creep.name, dcreep, capacity);
                    if (capacity) {
                        let amount = Math.min(carry, capacity);
                        creep.transfer(dcreep, RESOURCE_ENERGY, amount);
                        creep.credit = (creep.credit||0) - amount;
                        dcreep.credit = (dcreep.credit||0) + amount;
                    }
                }
                else {
                    for (let resourceType in creep.carry) {
                        let containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter:
                            s => ((s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store[resourceType] < s.storeCapacity)
                            || (s.structureType === STRUCTURE_LINK && s.energy < s.energyCapacity),
                        });
                        let container = containers && containers[0];
                        if (container) {
                            let cap = ((container.energyCapacity||0) - (container.energy||0)) + (container.store||0) && (container.storeCapacity - _.sum(container.store))
                            let amount = Math.min(carry, cap);
                            creep.transfer(container, resourceType, amount);
                            creep.credit = (creep.credit||0) - amount;
                        }
                        else {
                            creep.drop(resourceType);
                            creep.credit = -carry;
                        }
                    }
                }
            }
            if (carry < creep.carryCapacity && pathIndex == 0) {
                let resources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
                let resource = resources && resources[0];
                if (resource) {
                    let amount = Math.min(_.sum(resource), creep.carryCapacity - _.sum(creep.carry));
                    if (OK === creep.pickup(resource))
                        creep.credit = (creep.credit||0) + amount;
                }
                let capacity = creep.carryCapacity - (_.sum(creep.carry) + (creep.credit||0));
                let miner = creep.quarry.miner;
                if (capacity && miner && miner.carry.energy) {
                    let amount = Math.min(capacity, miner.carry.energy)
                    let result = miner.transfer(creep, RESOURCE_ENERGY);
                    if (OK === result) {
                        creep.credit = (creep.credit||0) + amount;
                    }
                }
            }
        })

        // then try to move any energy downstream
        creeps.forEach(creep => {
            let carry = creep.carry.energy + (creep.credit||0);
            let pathIndex = creep.pathIndex;
            let path = creep.quarry.path.path;
            if ((carry > 0 && pathIndex > 0) || (pathIndex == 0 && carry == creep.carryCapacity)) {
                if (pathIndex < (path.length - 1)) {
                    let d = path[pathIndex + 1];
                    let dest = new RoomPosition(d.x, d.y, d.roomName);
                    let direction = getDirection(creep.pos, dest);
                    creep.move(direction);
                }
            }
        })

        // now try to move all empty creeps upstream
        creeps.forEach(creep => {
            let carry = creep.carry.energy + (creep.credit||0);
            let pathIndex = creep.pathIndex;
            let path = creep.quarry.path.path;
            if (carry <= 0) {
                if (pathIndex > 0) {
                    let d = path[pathIndex - 1];
                    let dest = new RoomPosition(d.x, d.y, d.roomName);
                    let direction = getDirection(creep.pos, dest);
                    creep.move(direction);
                }
            }
        })
    },
    request: function(makeRequest) {
        for (let name in quarryTeams) {
            let quarry = quarryTeams[name];
            if (quarry.isPaused()) {
                console.log("Quarry",name,"is paused");
                continue;
            }
            const haveCarry = quarry.carriers.reduce((a,v) => a + v.getActiveBodyparts(CARRY), 0);
            const desiredCarry = quarry.calcDesiredCarryParts();
            if (!quarry.miner) {
                recruit(quarry, makeRequest, 'miner', {max: 1000, parts: [WORK,CARRY,MOVE]});
            }
            else if (!quarry.construct && quarry.flag.room) {
                // this quarry doesn't have a construct but we do have room access
                if (quarry.memory.complete)
                    recruit(quarry, makeRequest, 'construct', {assembly: [WORK,CARRY,MOVE,MOVE]});
                else
                    recruit(quarry, makeRequest, 'construct', {parts: [WORK,CARRY,MOVE,MOVE,WORK,MOVE,WORK,MOVE,WORK,MOVE,WORK,MOVE,CARRY,MOVE,WORK,MOVE,CARRY,MOVE], max: 1200})
            }
            else if (haveCarry < desiredCarry) {
                let need = Math.max(2, desiredCarry - haveCarry);
                let maxCost = 100 * need;
                recruit(quarry, makeRequest, 'carrier', {parts: [CARRY,MOVE], max: maxCost})
            }
            //console.log(quarry.flag.name, quarry.miner && quarry.miner.name, quarry.construct && quarry.construct.name);
        }
    },
}

function recruit(quarry, makeRequest, role, specs) {
    if (unemployed[role].length) {
        let creep = unemployed[role].pop();
        creep.memory.quarry.name = quarry.flag.name;
        console.log(creep.name, "=> quarry", quarry.flag.name);
        return;
    }
    let room = quarry.findOrigin();
    console.log("quarry", quarry.flag.name, "requesting", role, "from room", room);
    makeRequest(room, {
        providing:'energy',
        creep: Object.assign({}, specs, {sector: 'quarry', memory: {quarry: {name: quarry.flag.name, role: role}}}),
    });
}

module.exports = QuarrySector;
