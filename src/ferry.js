var selfRepair = require('self-repair');
var _ = require('lodash');

let routes = {};

function getPos(value) {
    let flag = Game.flags[value];
    if (!flag)
        return null;
    return flag.pos;
}

/*
    Ferry.create({id: "ferry1", load: "flag1", unload: "flag2", desired: 4});
*/

function Route(routeDef) {
    this.def = routeDef;
    this.loadPos = getPos(routeDef.load);
    this.unloadPos = getPos(routeDef.unload);
    this.employed = 0;
    this.desired = routeDef.desired || 4;
    this.paused = routeDef.paused || (routeDef.pauseUntil && (routeDef.pauseUntil > Game.time));
    if (routeDef.pauseUntil && !this.paused)
        delete routeDef.pauseUntil;
}
Route.prototype.pause = function(pauseTime) {
    if (pauseTime) {
        this.def.pauseUntil = Game.time + pauseTime;
        delete this.def.paused;
    }
    else {
        this.def.paused = true;
        delete this.def.pauseUntil;
    }
    this.paused = true;
}
Route.prototype.unpause = function() {
    delete this.def.paused;
    delete this.def.pauseUntil;
    this.paused = false;
}

let unemployed = [];

const Ferry = {
    init: function() {
        global.Ferry = Ferry;
    },
    run: function(room) {
        let routeDefs = Memory.ferryRoutes||{};
        for (var id in routeDefs) {
            routes[id] = new Route(routeDefs[id]);
        }
    },
    stats: function(creep) {
        let route = routes[creep.memory.route||'none'];
        if (!route) {
            delete creep.memory.route;
            unemployed.push(creep);
            return;
        }
        route.employed++;
    },
    employ: function(creep) {
        let route = routes[creep.memory.route||'none'];
        if (!route)
            return;
        if (!creep.room.isFriendly && creep.room.invaders.some(i => i.getActiveBodyparts(ATTACK) || i.getActiveBodyparts(RANGED_ATTACK))) {
            let invaderTtl = creep.room.invaders.reduce((ttl,invader) => ttl = Math.max(invader.ticksToLive||0, ttl), 0) || 1501;
            if (!route.paused) {
                route.pause(invaderTtl);
                Game.notify("invader detected, pausing "+route.def.id+" for "+invaderTtl, 0,"("+creep.room.invaders[0].owner+")");
            }
            // TODO: evade invaders
            creep.moveTo(route.unloadPos);
        }
        if (!creep.carryCapacity) {
            console.log("Creep",creep.name,"without carry capacity assigned to ferry? maybe damaged");
            let spawn = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN})
            if (spawn) {
                let result = spawn.recycleCreep(creep);
                if (ERR_NOT_IN_RANGE == result)
                    creep.moveTo(spawn);
                else if (OK == result)
                    console.log('recycled',creep.name);
                else
                    console.log('recycle of',creep.name,'failed with',result);
                return;
            }
        }
        //if (selfRepair(creep))
        //    return;
        let carry = _.sum(creep.carry)
        if (carry >= creep.carryCapacity) {
            if (creep.pos.x == route.unloadPos.x && creep.pos.y == route.unloadPos.y && (!route.unloadPos.room || route.unloadPos.room == room.name)) {
                for (let resourceType in creep.carry) {
                    let remain = creep.carry[resourceType];
                    containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE) && s.store[resourceType] < s.storeCapacity});
                    if (containers.length) {
                        containers.forEach(container => {
                            let capacity = container.storeCapacity - container.store[resourceType];
                            let amount = Math.min(capacity, remain);
                            if (OK == creep.transfer(container, resourceType, amount))
                                remain -= amount;
                        })
                    }
                    else {
                        creep.drop(resourceType, remain);
                        // TODO: see if the move below causes the drop to be at a different location
                        // if not, then enable it to move a tick sooner
                        // creep.moveTo(route.loadPos);
                    }

                }
            }
            else {
                creep.moveTo(route.unloadPos);
            }
        }
        else {
            if (route.paused)
                return;
            if (creep.pos.x == route.loadPos.x && creep.pos.y == route.loadPos.y && (!route.loadPos.room || route.loadPos.room == room.name)) {
                let resources = creep.pos.findInRange(FIND_DROPPED_RESOURCES, 1);
                let resource = resources && resources[0];
                if (resource) {
                    let result = creep.pickup(resource);
                    // TODO: see if the move below causes the pickup to fail
                    // if not, then enable it to move a tick sooner
                    // creep.moveTo(route.unloadPos);
                }
                else {
                    let capacity = creep.carryCapacity - carry;
                    let miners = creep.pos.findInRange(FIND_MY_CREEPS, 1, {filter: c => c.memory.sector === 'miner' && _.sum(c.carry)})
                    if (miners.length) {
                        miners.forEach(miner => {
                            for (let resourceType in miner.carry) {
                                let amount = Math.min(capacity, miner.carry[resourceType])
                                if (OK == miner.transfer(creep, resourceType, amount))
                                    capacity -= amount
                            }
                        })
                    }
                    if (capacity) {
                        let containers = creep.pos.findInRange(FIND_STRUCTURES, 1, {filter: s => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE || (s.owner && !s.my && (s.store || s.energy)))})
                        containers.forEach(container => {
                            if (container.energy) {
                                let amount = Math.min(capacity, container.energy)
                                if (OK == creep.withdraw(container, RESOURCE_ENERGY, amount))
                                    capacity -= amount;
                            }
                                
                            for (let resourceType in container.store) {
                                let amount = Math.min(capacity, container.store[resourceType])
                                if (OK == creep.withdraw(container, resourceType, amount))
                                    capacity -= amount;
                            }
                        })
                    }
                }
            }
            else {
                let loadPos = route.loadPos;
                creep.moveTo(loadPos);
            }
        }
    },
    request: function(makeRequest) {
        for (let name in routes) {
            let route = routes[name];
            if (route.paused)
                continue;
            while (route.employed < route.desired && unemployed.length) {
                let creep = unemployed.pop();
                console.log(creep.name, "=> route", route.def.id);
                route.employed++;
                creep.memory.route = route.def.id;
            }
            if (route.employed < route.desired) { 
                let unloadFlag = Game.flags[route.def.unload];
                let roomName = unloadFlag.pos.roomName;
                console.log("route", route.def.id, "with", route.employed, "of", route.desired, "requesting creep","room:"+roomName);
                makeRequest(roomName, {providing:'energy', creep: {parts:[CARRY,MOVE],sector:'ferry',max:350}});
            }
        }
    },
    create: function(routeDef) {
        let routeDefs = Memory.ferryRoutes||{};
        routeDefs[routeDef.id] = routeDef;
        Memory.ferryRoutes = routeDefs;
    },
    list: function(room) {
        let all = Memory.ferryRoutes||{};
        for (let name in all) {
            let routeDef = all[name];
            console.log(name, "=>", JSON.stringify(routeDef));
        }
    },
    pause: function(id,pauseFor) {
        let route = routes[id];
        route.pause(pauseFor);
        return JSON.stringify(route.def);
    },
    unpause: function(id) {
        let route = routes[id];
        route.unpause();
        return JSON.stringify(route.def);
    },
};

module.exports = Ferry;
