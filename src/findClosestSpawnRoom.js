"use strict";

function findClosestSpawn(pos) {
    let closest;
    for (var spawnName in Game.spawns) {
        let spawn = Game.spawns[spawnName];
        let route = Game.map.findRoute(spawn.room, pos.roomName);
        if (!closest || closest.distance > route.length)
            closest = {distance: route.length, room: spawn.room};
    }
    return closest.room.name;
}

module.exports = findClosestSpawn;
