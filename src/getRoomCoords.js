"use strict";

function getRoomCoords(roomName) {
    let match = /^([EW])([0-9]+)([NS])([0-9]+)$/.exec(roomName);
    return {
        x: (match[2]|0) * (match[1] === 'E' ? 1 : -1),
        y: (match[4]|0) * (match[3] === 'S' ? 1 : -1),
    }
}

module.exports = getRoomCoords;
