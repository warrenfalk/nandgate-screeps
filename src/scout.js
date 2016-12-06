const _ = require('lodash');

function Scout(flag) {
    this.flag = flag;
}

let scouts;
let unemployed;

const ScoutSector = {
    init: function() {
        unemployed = [];
        scouts = {};
        for (let name in Game.flags) {
            let flag = Game.flags[name];
            scouts[name] = new Scout(flag);
        }
    },
    run: function(room) {

    },
    stats: function(creep) {
        let name = creep.memory.scout;
        if (!name) {
            unemployed.push(creep);
            return;
        }
        let scout = scouts[name];
        scout.creep = creep;

    },
    employ: function(creep) {
        let name = creep.memory.scout;
        if (!name)
            return;
        let scout = scouts[name];
        if (creep.getRangeTo(scout.flag) != 0)
            creep.moveTo(scout.flag);
    },
    request: function(makeRequest) {
        for (let name in scouts) {
            let scout = scouts[name];
            if (!scout.creep) {
                console.log("scout", name, "requesting creep");
            }
        }
    },
}

module.exports = ScoutSector;