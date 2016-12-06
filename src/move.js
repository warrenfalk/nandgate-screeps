/*
 * Ideas:
 * It should be possible to cache the cost matrix for an entire room
 * Also it should be possible to cache the paths between any two points
 * That cache can be kept around for some period of time, reset every use
 * The paths ignore creeps
 * Every creep logs on its room's ephemeral storage the coordinates it expects to be on next tick
 * At the end of the round, conflicts in this list are resolved
 * The conflict can be resolved by path finding, ignoring creeps again, but also avoiding any space a creep has reserved
 * If a creep gets blocked by a structure, then
 *    0. The cost matrix is invalidated, and a new one is built
 *    1. The path it used is invalidated
 *    2. A new one is calculated for its current situation

 Then there are just a couple things remaining:
 Caravan handling (ferries which bunch up at the ends while waiting, should wait in line)
 Parking on a highway (a builder can sit where paths have been cached, treat this like a building?)
 */