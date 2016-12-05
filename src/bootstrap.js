const projects = {};

const unemployed = [];

/*
{id: "B1", room: "W23S68", fromRoom: "W23S69", workParts: 10}
*/

function Project(def) {
    this.def = def;
    this.stats = {
        workParts: 0,
    };
}
Project.prototype.isPaused = function() {
    return this.def.paused;
}
Project.prototype.getDesiredWorkParts = function() {
    return this.def.workParts || 10;
}
Project.prototype.getId = function() {
    return this.def.id;
}
Project.prototype.getBootstrapRoomName = function() {
    return this.def.room;
}
Project.prototype.getSendingRoomName = function() {
    return this.def.fromRoom;
}

const Bootstrap = {
    init: function() {
        global.Bootstrap = Bootstrap;
        let defs = Memory.bootstrapParties||{};
        for (var id in defs) {
            projects[id] = new Project(defs[id]);
        }
    },
    run: function(room) {
    },
    stats: function(creep) {
        let project = projects[creep.memory.project||'none'];
        if (!project) {
            delete creep.memory.project;
            unemployed.push(creep);
            return;
        }
        project.stats.workParts += creep.getActiveBodyparts(WORK);
    },
    request: function(makeRequest) {
        for (let name in projects) {
            let project = projects[name];
            if (project.isPaused())
                continue;
            let desiredWorkParts = project.getDesiredWorkParts();
            while (project.stats.workParts < desiredWorkParts && unemployed.length) {
                let creep = unemployed.pop();
                console.log(creep.name, "=> project", project.getId());
                project.stats.workParts += creep.getActiveBodyparts(WORK);
                creep.memory.project = project.getId();
            }
            if (project.stats.workParts < desiredWorkParts) { 
                console.log("bootstrap", project.getId(), "with", project.stats.workParts, "of", desiredWorkParts, " work, requesting creep");
                makeRequest(project.getSendingRoomName(), {providing:'energy', creep: {parts:[WORK,CARRY,MOVE],sector:'bootstrap',max:1000}});
            }
        }
    },
    employ: function(creep) {
        let project = projects[creep.memory.project||'none'];
        if (!project)
            return;
        if (project.isPaused())
            return;
        if (creep.spawning)
            return;
        if (creep.carry.energy >= creep.carryCapacity) {
            let bootstrapRoomName = project.getBootstrapRoomName();
            let bootstrapRoom = Game.rooms[bootstrapRoomName];
            let spawnConstructionSites = bootstrapRoom.find(FIND_CONSTRUCTION_SITES,{filter: s => s.structureType == STRUCTURE_SPAWN})
            if (spawnConstructionSites.length) {
                let site = spawnConstructionSites[0];
                let result = creep.build(site);
                if (result === ERR_NOT_IN_RANGE)
                    creep.moveTo(site);
                return;
            }
            let spawns = bootstrapRoom.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN})
            if (spawns.length) {
                console.log("Bootstrap of room " + bootstrapRoomName + " complete, deleting project");
                Game.notify("Bootstrap of room " + bootstrapRoomName + " complete", 0);
                delete Memory.bootstrapParties[project.getId()];
                return;
            }
        }
        else {
            let resource = creep.pos.findClosestByRange(FIND_DROPPED_RESOURCES, {filter: r => r.resourceType == RESOURCE_ENERGY});
            if (resource) {
                let result = creep.pickup(resource);
                if (result === ERR_NOT_IN_RANGE)
                    creep.moveTo(resource);
                return;
            }
            let storage = creep.pos.findClosestByRange(FIND_MY_STRUCTURES, {filter: 
                s => (s.structureType === STRUCTURE_CONTAINER || s.structureType == STRUCTURE_STORAGE)
                    && (s.store[RESOURCE_ENERGY] > 0)    
            });
            if (storage) {
                let result = creep.withdraw(storage, RESOURCE_ENERGY);
                if (result == ERR_NOT_IN_RANGE)
                    creep.moveTo(storage);
                return;
            }
            let source = creep.pos.findClosestByRange(FIND_SOURCES, {filter: s => s.energy > 0});
            if (source) {
                let result = creep.harvest(source);
                if (result === ERR_NOT_IN_RANGE)
                    creep.moveTo(resource);
                return;
            }
        }
    },
    create: function(bootstrapPartyDef) {
        let defs = Memory.bootstrapParties||{};
        defs[bootstrapPartyDef.id] = bootstrapPartyDef;
        Memory.bootstrapParties = defs;
    },
};

module.exports = Bootstrap;