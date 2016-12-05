var Employment = require('employment');
var selfRepair = require('self-repair');

function firstBuildPriority(room) {
    let buildPrio = room.memory.buildPrio;
    if (!buildPrio || buildPrio.length == 0)
        return null;
    for(;buildPrio.length > 0;) {
        let next = Game.getObjectById(buildPrio[0]);
        if (next)
            return next;
        console.log("Removing", buildPrio[0], "from build priorities");
        buildPrio = buildPrio.slice(1);
        room.memory.buildPrio = buildPrio;
    }
}

function addBuildPriority(room, id) {
    let buildPrio = room.memory.buildPrio||[];
    buildPrio.push(id);
    room.memory.buildPrio = buildPrio;
}

function isWall(s) {
    return s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART;
}

module.exports = {
    isComplete: function(creep) {
        return creep.carry.energy == 0;
    },
    work: function(creep) {
        //if (selfRepair(creep))
        //    return;
        let memory = creep.memory;
        if (!creep.room.hasWorkingTower) {
            let repair = creep.pos.findInRange(FIND_STRUCTURES, 3, {filter:
                s => (!isWall(s) && s.hits < (s.hitsMax * 0.2))
                || (isWall(s) && s.hits < 500)
            })
            if (repair.length) {
                if (OK == creep.repair(repair[0]))
                    return;
            }
        }
        let site = firstBuildPriority(creep.room) || creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES, {filter: c => c.my});
        if (!site || !creep.carry.energy) {
            delete memory.loc;
            delete memory.goal;
            return;
        }
        let result = creep.build(site);
        if (result == OK) { }
        else if (result == ERR_NOT_IN_RANGE) {
            /*
            if (!memory.loc) {
                // TODO: try to more carefully assign to construction sites to maximize completion
                // the algorithm should attempt to put all resources into one site until complete and then move on
                site = firstBuildPriority(creep.room) || creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {ignoreCreeps: true}) || creep.pos.findClosestByRange(FIND_CONSTRUCTION_SITES);
                memory.loc = {x: site.pos.x, y: site.pos.y};
                creep.say("B:"+site.pos.x+","+site.pos.y);
            }
            */
            creep.moveTo(site, {range: 3});
        }
        else if (result == ERR_RCL_NOT_ENOUGH) {
            console.log('ERR_RCL_NOT_ENOUGH, switching to upgrade');
            delete memory.loc;
            memory.goal = 'upgrade';
        }
        else if (result == ERR_INVALID_TARGET) {
            creep.say("B:invalid");
            console.log("build invalid", site);
            delete memory.loc;
        }
        else {
            creep.say("B:fail");
            console.log("build result " + result);
            delete memory.loc;
        }
   },
   firstBuildPriority: firstBuildPriority,
   addBuildPriority: addBuildPriority,
};