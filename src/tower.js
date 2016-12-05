const byHits = (a,b) => a.hits - b.hits;
const sortByHits = (array) => array.sort(byHits);

const getHitGoal = (s) => {
    if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART)
        return Math.min(10000, s.hitsMax);
    return s.hitsMax;
}

module.exports = {
    run: function(room) {
        let towers = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType === STRUCTURE_TOWER});
        let targets = [];
        if (targets.length < towers.length)
            Array.prototype.push.apply(targets, room.find(FIND_HOSTILE_CREEPS))
        if (targets.length < towers.length)
            Array.prototype.push.apply(targets, room.find(FIND_MY_CREEPS, {filter: s => (s.hitsMax - s.hits) >= 400}))
        if (targets.length < towers.length)
            Array.prototype.push.apply(targets, sortByHits(room.find(FIND_STRUCTURES, 
            {filter: s => (getHitGoal(s) - s.hits) >= 800}
        )))
        towers.forEach(tower => {
            let target = targets.shift();
            if (target instanceof Creep) {
                if (target.my) {
                    tower.heal(target);
                }
                else {
                    target.targeted = true;
                    tower.attack(target);
                }
            }
            else if (target instanceof Structure) {
                let result = tower.repair(target);
                if (result == OK) {}
                else if (result == ERR_NOT_ENOUGH_RESOURCES) {}
                else
                    console.log("tower.repair() ==", result);
            }
        });
    }
};