"use strict";
var harvestGoal = require('goal.harvest');
var buildGoal = require('goal.build');
var supplyGoal = require('goal.supply');
var upgradeGoal = require('goal.upgrade');
var towerGoal = require('goal.tower');

const defaultGoal = 'build';

function findJob(creep, room) {
    if (creep.carry.energy < creep.carryCapacity) {
        return 'harvest'
    }
    else {
        return 'dispense'
    }
}


const WorkerSector = {
	init: function() {

	},
	run: function(room) {

	},
	stats: function(creep) {
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
	},
	employ: function(creep) {
        let goal = creep.memory.goal;
        switch (goal) {
            case 'harvest':
                harvestGoal.preCheck(creep);
                break;
        }
        if (creep.newGoal && creep.newGoal != creep.memory.newGoal) {
            creep.memory.goal = creep.newGoal;
            delete creep.memory.loc;
        }
	}
}

module.exports = WorkerSector;