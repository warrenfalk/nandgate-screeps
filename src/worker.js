"use strict";

const WorkerSector = {
	init: function() {

	},
	run: function(room) {

	},
	stats: function(room) {

	},
	employ: function(creep) {
        let room = creep.room;
        let goal = creep.memory.goal;
        let complete = !goal;
        switch (goal) {
            case 'harvest':
                complete = harvestGoal.isComplete(creep);
                break;
            case 'supply':
                complete = supplyGoal.isComplete(creep);
                break;
            case 'build':
                complete = buildGoal.isComplete(creep);
                break;
            case 'upgrade':
                complete = upgradeGoal.isComplete(creep);
                break;
            case 'tower':
                complete = towerGoal.isComplete(creep);
                break;
            case 'manual':
                complete = false;
                break;
        }
        if (complete) {
            goal = findJob(creep, room);
            creep.newGoal = goal;
        }
	}
}

module.exports = WorkerSector;