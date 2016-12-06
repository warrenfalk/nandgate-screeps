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

// calculate the total stored energy
// base the number of desired work parts based on the total stored energy
// so that with fewer workers to carry away and use energy, the storage builds up causing more workers until equilibrium is reached
let getDesiredWorkParts = (room) => 5 + Math.ceil(room.storedEnergy * 0.002);


const WorkerSector = {
	init: function() {

	},
	run: function(room) {
        if (room.isFriendly)
            console.log(room.name,"work parts have/desired",room.work+"/"+getDesiredWorkParts(room));
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

        goal = creep.newGoal || creep.memory.goal;
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
        goal = creep.memory.goal;
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
	},
	request: function(makeRequest) {
		for (let roomName in Game.rooms) {
			let room = Game.rooms[roomName];
	        let spawn = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_SPAWN})[0];
	        if (!spawn)
	            continue;
	        let desiredWork = getDesiredWorkParts(room);
	        if (room.work < desiredWork) {
	        	console.log(roomName, "with", (room.work+' of '+desiredWork), "work parts, requesting creep")
	            //if (room.energyAvailable >= buildSize || room.work == 0) {
				//makeRequest(roomName, {providing:'energy', creep: {parts:[WORK,CARRY,MOVE,WORK,CARRY,MOVE,WORK,MOVE,WORK,MOVE,WORK,MOVE,CARRY,MOVE],sector:undefined}});
	        }
		}
	},
}

module.exports = WorkerSector;