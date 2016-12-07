/*
A quarry is a system for distant mining

It is a miner who sits on the mine
Carriers who ferry the energy
And a builder who builds and maintains a road
*/

const _ = require('lodash');

function Quarry(flag) {
    this.flag = flag;
    this.carriers = [];
    if (!Memory.quarry)
        Memory.quarry = {};
    if (!Memory.quarry[flag.name])
        Memory.quarry[flag.name] = {};
    let memory = Memory.quarry[flag.name];

    let path = (memory.drop && ((Game.time - memory.drop.time) < 3000) && memory.drop) || this.findPath();
    memory.path = path;
    let drop = path[path.length - 1];

    this.memory = memory;
    this.path = path;
    this.drop = drop;
}
const WORK_RATE = 2;
const CARRY_RATE = 50;
const RNDTRIP_FACTOR = 0.5;
const CARRY_EFFICIENCY = 0.85; // the carry efficiency we expect
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
            console.log("harvest mineral",result);
        }
    }
}
Quarry.prototype.employCarrier = function(creep) {

}
Quarry.prototype.employConstructor = function(creep) {
    let carry = creep.carry.energy;
    let loadDistance = creep.pos.getRangeTo(this.flag.pos);
    if (carry === 0 || (loadDistance <= 1 && carry < creep.carryCapacity)) {
        if (loadDistance > 1) {
            creep.moveTo(this.flag.pos, {range: 1})
        }
        else {
            let resources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
            let resource = resources && resources[0];
            if (resource) {
                let result = creep.pickup(resource);
            }
            else {
                miner.transfer(creep, RESOURCE_ENERGY);
            }
        }
    }
    else {
        // I have energy, so I should be crawling the path
        let m = creep.memory.quarry;
        let index = m.index || 0;
        let loc = this.path.path[index];
        console.log('loc', JSON.stringify(loc));
        let contents = Game.rooms[loc.roomName].lookAt(loc.x, loc.y);
        let road = contents.find(s => s.structureType === STRUCTURE_ROAD || (s.type === "constructionSite") && s.constructionSite.structureType === STRUCTURE_ROAD))
        if (!road) {
            // if there is no road, there, start the road
            Game.rooms[loc.roomName].createConstructionSite(loc.x, loc.y, STRUCTURE_ROAD);
        }
        else if (road.type === "constructionSite") {
            // if it is still a construciton site, start building it
            creep.build(road);
        }
        else {
            console.log("ROAD", road.id);
        }
    }
}
Quarry.prototype.findPath = function() {
    let origin = this.findOrigin();
    let room = Game.rooms[origin];
    // find links and storages
    let candidates = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_LINK || s.structureType === STRUCTURE_STORAGE})
    // get within 1 square
    candidates = candidates.map(o => ({pos: o.pos, range: 1}));
    // find path to closest
    let pathData = PathFinder.search(this.flag.pos, candidates, {
        plainCost: 2,
        swampCost: 2, // we're going to build road over this eventually, so just go shortest path
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
            return costs;
        }
    })
    let path = {path: pathData.path, time: Game.time};
    return path;
}
Quarry.prototype.findOrigin = function() {
    let closest;
    for (var spawnName in Game.spawns) {
        let spawn = Game.spawns[spawnName];
        let route = Game.map.findRoute(spawn.room, this.flag.pos.roomName);
        if (!closest || closest.distance > route.length)
            closest = {distance: route.length, room: spawn.room};
    }
    return closest.room.name;
}
Quarry.prototype.balance = function() {
    // if the constructor has no carry, then swap them
    if (this.construct.getActiveBodyparts(CARRY) == 0)
        this.swap();
    // the one with the closest to 5 work parts should be the miner
    if (Math.abs(5 - this.miner.getActiveBodyparts(WORK)) > Math.abs(5 - this.construct.getActiveBodyparts(CONSTRUCT)) && this.miner.getActiveBodyparts(CARRY) > 0)
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
            construct: []
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
        quarry.employ(creep);
    },
    request: function(makeRequest) {
        for (let name in quarryTeams) {
            let quarry = quarryTeams[name];
            if (!quarry.miner) {
                recruit(quarry, makeRequest, 'miner', {max: 1000, parts: [WORK,CARRY,MOVE]});
            }
            else if (!quarry.construct) {
                recruit(quarry, makeRequest, 'construct', {assembly: [WORK,CARRY,MOVE,MOVE]});
            }
            console.log("desired quarry CARRY parts", quarry.calcDesiredCarryParts());
            /*
            else if ((quarry.carriers.length * 2) < quarry.calcDesiredCarryParts()) {
                recruit(quarry, makeRequest, 'carrier', {assembly: [CARRY,CARRY,MOVE,MOVE]})
            }
            */
        }
    },
}

function recruit(quarry, makeRequest, role, specs) {
    if (unemployed[role].length) {
        let creep = unemployed[role].pop();
        creep.memory.quarry.name = name;
        console.log(creep.name, "=> quarry", name);
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