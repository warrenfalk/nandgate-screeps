let unemployed = []

const toXY = (node) => ({x:node.x, y:node.y});

function prohibit(path) {
    return (roomName, costMatrix) => {
        path.forEach(n => costMatrix.set(n.x, n.y, 255));
    }
}

function createConveyor({room, load, unload, name}) {
    let loadPos = room.getPositionAt(load.x, load.y);
    let unloadPos = room.getPositionAt(unload.x, unload.y);
    let full = room.findPath(loadPos, unloadPos, {ignoreCreeps: true, ignoreRoads: true});
    let fullSegment = full.slice(1, full.length - 1);
    let empty = room.findPath(unloadPos, loadPos, {ignoreCreeps: true, ignoreRoads: true, costCallback: prohibit(fullSegment)});
    let fullLine = full.slice(1, full.length - 1).map(toXY);
    let emptyLine = empty.slice(1, empty.length - 1).map(toXY);
    let overlap = emptyLine.filter(en => fullLine.some(fn => fn.x == en.x && fn.y == en.y));
    if (overlap.length)
        console.log("OVERLAP", overlap.length, JSON.stringify(overlap));
    let id = "cv."+load.x+"."+load.y+"."+unload.x+"."+unload.y;
    let conveyor = {id: id, room: room.name, load: load, unload: unload, fullLine: fullLine, emptyLine: emptyLine};
    if (name)
        conveyor.name = name;
    return conveyor;
}

function enableConveyor(conveyor) {
    let room = Game.rooms[conveyor.room];
    let conveyors = room.memory.conveyors || {};
    conveyors[conveyor.id] = conveyor;
    room.memory.conveyors = conveyors;
}

function getExtents(extents, node) {
    extents.top = extents.top === undefined ? node.y : Math.min(node.y, extents.top);
    extents.bottom = extents.bottom === undefined ? node.y : Math.max(node.y, extents.bottom);
    extents.left = extents.left === undefined ? node.x : Math.min(node.x, extents.left);
    extents.right = extents.right === undefined ? node.x : Math.max(node.x, extents.right);
    return extents;
}

function allNodes(conveyor) {
    return [conveyor.load, conveyor.unload].concat(conveyor.fullLine).concat(conveyor.emptyLine);
}

const EMPTYOBJ={};
const EMPTY=[];

function containsRoad(area, node) {
    let objs = (area[node.y]||EMPTYOBJ)[node.x]||EMPTY;
    return objs.some(o => (o.type === "structure" && o.structure.structureType === "road") || (o.type == "constructionSite" && o.constructionSite.structureType === "road"));
}

function buildRoads(conveyors) {
    for (let id in conveyors) {
        let conveyor = conveyors[id];
        let nodes = allNodes(conveyor);
        let dimensions = nodes.reduce(getExtents, {});
        let room = Game.rooms[conveyor.room];
        let area = room.lookAtArea(dimensions.top, dimensions.left, dimensions.bottom, dimensions.right);
        // find which path nodes don't already contain roads or construction sites and build them
        let needRoads = nodes.filter(node => !containsRoad(area, node));
        needRoads.forEach(node => {
            room.createConstructionSite(node.x, node.y, "road");
        });
    }
}

function Conveyor(conveyorDef) {
    this.def = conveyorDef;
}
Conveyor.prototype = {
    findRoleFor: function(creep) {
        if (creep.carryCapacity)
            return "conveyor";
        if (this.counts.miner == 0)
            return "miner";
    },
    giveOrders: function(creep) {
        if (creep.role == "conveyor") {
            let goal = creep.memory.goal;
            if (!goal)
                creep.memory.goal = goal = creep.carry.energy > 0 ? "carry" : "return";
            
        }
    },
}

function conveyorGetRequests(conveyor) {
    
}

function assignConveyor(creep, conveyors) {
    let requests = [];
    for (var name in conveyors) {
        let conveyor = conveyors[name];
        requests = requests.concat(conveyorGetRequests(conveyor));
    }
}

module.exports = {
    run: function(room) {
        // load all conveyor definitions from memory
        // and then create ephemeral conveyor objects
        let conveyorDefs = room.memory.conveyors || {};
        let conveyors = {};
        for (let name in conveyorDefs)
            conveyors[name] = new Conveyor(conveyorDefs[name]);
            
        //buildRoads(conveyorDefs);
        
        // go through all creeps and assign any in the conveyor sector
        // but not assigned already to a conveyor
        // then update the conveyor's statistics
        let toAssign = [];
        for (var name in Game.creeps) {
            let creep = Game.creeps[name];
            if (creep.sector !== 'conveyor')
                continue;
            let conveyor = creep.conveyor && conveyors[creep.conveyor];
            if (!conveyor) {
                delete creep.role;
                delete creep.goal;
                toAssign.push(creep);
                continue;
            }
            let role = creep.role || "idle";
            conveyor.counts[role] = (conveyor.counts[role] || 0) + 1;
        }
        
        // go through the creeps again and find a role for any that don't have a role
        for (var name in Game.creeps) {
            let creep = Game.creeps[name];
            if (creep.sector !== 'conveyor')
                continue;
            let role = creep.role || "idle";
            if (role === "idle") {
                let newRole = conveyor.findRoleFor(creep);
                creep.role = newRole;
                conveyor.count[newRole] = (conveyor.count[newRole]||0) + 1;
            }
        }
        
        // go through the creeps one last time and have the conveyors give orders
        for (var name in Game.creeps) {
            let creep = Game.creeps[name];
            if (creep.sector !== 'conveyor')
                continue;
            let conveyor = creep.conveyor && conveyors[creep.conveyor];
            conveyor.giveOrders(creep);
        }
    },
    stats: function(creep) {
        
    },
    employ: function(creep) {
        
    },
    createConveyor: createConveyor,
    enableConveyor: enableConveyor,
};