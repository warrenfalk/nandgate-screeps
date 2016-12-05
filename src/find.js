function energyTargets(room) {
    if (room.energyTargets)
        return room.energyTargets;
    room.energyTargets = room.find(FIND_MY_STRUCTURES, (s) => s.structureType === STRUCTURE_SPAWN);
    return room.energyTargets;
}
function energySources(room) {
    if (room.energySources)
        return room.energySources;
    room.energySources = room.find(FIND_SOURCES);
    return room.energySources;
}

module.exports = {
    energyTargets: energyTargets,
    energySources: energySources,
}
