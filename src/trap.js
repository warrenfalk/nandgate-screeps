module.exports = {
    run: function(flag) {
        if (!flag)
            return;
        let pos = flag.pos;
        let creeps = pos.lookFor(LOOK_CREEPS).some(creep => !creep.my);
        if (creeps.length) {
            ramparts = pos.findInRange(FIND_STRUCTURES, 2, {filter: s => s.structureType === STRUCTURE_RAMPART && s.isPublic});
            ramparts.forEach(rampart => {
                Game.notify("Sprung trap on invader at "+flag.name);
                console.log("Sprung trap on invader at",flag.name);
                rampart.setPublic(false);
            })
        }
        else {
            ramparts = pos.findInRange(FIND_STRUCTURES, 2, {filter: s => s.structureType === STRUCTURE_RAMPART && !s.isPublic});
            if (ramparts.length) {
                console.log("Reset trap at",flag.name);
                ramparts.forEach(rampart => {
                    //Game.notify
                    rampart.setPublic(true);
                })
            }
        }
    }
};