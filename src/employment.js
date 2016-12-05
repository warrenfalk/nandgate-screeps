function findJob(creep) {
    if (creep.carry.energy < creep.carryCapacity) {
        return 'harvest'
    }
    else {
        return 'build'
    }
}

function findUnemployed() {
        let unemployed = [];
        for (name in Game.creeps) {
            let creep = Game.creeps[name];
            if (!creep.memory.goal)
                unemployed.push(creep);
        }
        return unemployed;
}

function employ(creep) {
    creep.memory.goal = findJob(creep);
    console.log(creep.name + "'s new goal is " + creep.memory.goal);
    delete creep.memory.loc;
}

module.exports = {
    findJobs: function() {
        let unemployed = findUnemployed();
        unemployed.forEach(creep => employ(creep));
    },
    employ: employ
};