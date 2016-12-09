"use strict";
/*
Perhaps we could come up with a better name
but this is like a special forces thing
When others need a strike force because of an invader, they tag the invader and room
and request an attack force to come deal with it
this should be highest priority as long as the request is being refreshed
but we also want to make sure that it only creates a creep powerful enough to beat an invader

we would like to also be able to unpause anything that was paused due to the invader if the invader is killed
*/

module.export = function(creep, target, room) {
    creep.moveTo(target.pos);
    creep.attack(target);
};
