"use strict";

const getRoomCoords = require('./getRoomCoords');

function getDirection(originPos, destPos) {
    if (originPos.roomName === destPos.roomName)
        return originPos.getDirectionTo(destPos);
    let {x:sx, y:sy} = getRoomCoords(originPos.roomName);
    let {x:ex, y:ey} = getRoomCoords(destPos.roomName);
    let dx = ex - sx;
    let dy = ey - sy;
    let adjusted = new RoomPosition(destPos.x + dx, destPos.y + dy, originPos.roomName);
    return originPos.getDirectionTo(adjusted);
}

module.exports = getDirection;
