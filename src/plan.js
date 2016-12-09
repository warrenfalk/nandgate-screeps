"use strict";
/*
This module will contain code for planning out a base for automatic construction

One such idea is where to put spawns and where to construct extensions.

Some notes
* upgrading the controller is most important
* it is most important for central storage and drop off to be near the controller
* use quarry systems to mine sources and bring to central storage
* the spawn does not need to be so near the controller, but not so far away that it takes a long time to get there
* the extensions should form a checkerboard pattern with roads between them
* they should probably fan out from the controller rather than the spawn
*/


/**
Return the locations for extensions
*/
function getExtensionLocations(room, blocked) {
    const controller = room.controller;
    if (!controller)
        return null;
    /*
    The extensions will be placed in a checkerboard pattern
    This works well because diagonal movement in screeps is not blocked by diagonally adjacent structures
    The pattern is achieved by only selecting squares with the same value for (x+y)%2
    This results in the pattern below:

            0   1   2   3
          +---------------+
        0 | 0 | 1 | 0 | 1 |
          +---------------+
        1 | 1 | 0 | 1 | 0 |
          +---------------+
        2 | 0 | 1 | 0 | 1 |
          +---------------+
        3 | 1 | 0 | 1 | 0 |
          +---------------+

    And so the extensions will be placed on either zeroes or ones
    based on whether the controller is on a zero or one

    We also will not place an extension
        on a room edge or
        on a blocking structure or
        orthogonally adjacent to a blocking structure

    Then we score the location of each and sort by that score to prioritize building
    */
    const locations = [];
    const controllerParity = parityOf(controller.pos);
    for (let y = 1; y < 49; y++) {
        for (let x = 1; x < 49; x++) {
            let loc = {x: x, y: y};
            let parity = parityOf(loc);
            if (parity != controllerParity)
                continue;
            let isBlocked = blocked[ctoi(loc)];
            if (isBlocked)
                continue;
            let isOrthoBlocked
                = blocked[ctoi({x: x - 1, y: y})]
                || blocked[ctoi({x: x + 1, y: y})]
                || blocked[ctoi({x: x, y: y - 1})]
                || blocked[ctoi({x: x, y: y + 1})]
            if (isOrthoBlocked)
                continue;
            locations.push(loc);
        }
    }
}

/*
  Add walls and structures
*/
function addBlockers(room, map, callback) {
    const squares = room.lookAtArea(0, 0, 50, 50, true);
    const cb = (typeof callback !== "function") ? callback : () => callback;
    squares.forEach(square => {
        if (square.type === 'terrain' && square.terrain === 'wall') {
            const i = ctoi(square);
            map[i] = cb(map[i])
        }
        else if (square.type === 'structure') {
            const i = ctoi(square);
            map[i] = cb(map[i])
        }
    })
}

function visualizeBuildPlan(map) {

}

const ctoi = (c) => ((c.x|0) * 50) + (c.y|0);
const parityOf = (c) => (c.x + c.y) % 2;

