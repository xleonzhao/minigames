var Bukkit     = org.bukkit.Bukkit;
var Entity     = org.bukkit.entity;
var EntityType = org.bukkit.entity.EntityType;
var Vector     = org.bukkit.util.Vector;

load("nashorn:mozilla_compat.js");
importPackage(Packages.net.citizensnpcs.api);
var Citizen  = Packages.net.citizensnpcs.api;
importPackage(Packages.net.citizensnpcs.api.astar.pathfinder);
var PathFinder = Packages.net.citizensnpcs.api.astar.pathfinder;

var utils      = require('utils');
var inventory  = require('inventory');
var items      = require('items');

var npcCls     = require('minigames/npc.js');
var villainCls = require('minigames/villain.js');
var guardCls   = require('minigames/guard.js');
var playerCls  = require('minigames/player.js');
var AI         = require('minigames/ai.js').AI;
var pvsutil    = require('minigames/util.js');

var commands = [ "dnpc" ];

var _npcs   = [];
var _guards = [];

function debug_npc( params, player ) {
    var name = params[1];
    var npc = _npcs[ name ];

    if( ! npc ) {
	console.log("no such NPC " + name);
	return
    }
    console.log("DEBUG NPC");
    console.log(" - location:  " + npc.npc.entity.location);

    npc.attacker = server.getPlayer("Drew_Drew");
    if( npc.attacker ) {
	console.log(" - attacker: " + npc.attacker);
	//npc.turnAround();
	//npc.setFleeDir();
	//npc.fleeAway();
	npc.removeAllTargets();
	npc.fleeAway();
	/*
	var nav = npc.npc.navigator;
	if( nav.isNavigating() ) {
	    console.log(" is already navigating to " + nav.targetAsLocation );
	    var gc = npc.npc.defaultGoalController;
	    if( gc.isExecutingGoal() ) {
		console.log(" is executing a goal");
		gc.cancelCurrentExecution();
	    } else {
		console.log("no goal");
	    }
	    
	    //nav.cancelNavigation();
	    //npc.npc.navigator.paused = true;
	}
	*/
	/*
	var loc = npc.npc.entity.location;
        var vec = loc.toVector().subtract( npc.attacker.location.toVector() );
	vec.multiply( new Vector(1.0, 0.0, 1.0) );
	vec.normalize().multiply(10);

	var new_loc = loc.clone().add( vec );

	//var safeLoc = PathFinder.MinecraftBlockExaminer.findValidLocation( new_loc, 10 );
	var ret = pvsutil.findSafeLocation( new_loc, 10 );
	var found = ret[1];
	var safeLoc = ret[0];
	if( ! found ) {
	    vec.multiply( new Vector(-1.0, 0.0, 1.0) );
	    new_loc = loc.clone().add( vec );
	    ret = pvsutil.findSafeLocation( new_loc, 10 );
	    safeLoc = ret[0];
	}
	
	console.log("cur loc: " + loc);
	console.log("vec: " + vec);
	console.log("new loc: " + new_loc);
	console.log("target loc: " + safeLoc);

	var stl = npc.stlTrait;
	console.log("ranged=" + stl.rangedChase + ", close="  + stl.closeChase);
	stl.rangedChase =false;
	stl.closeChase = false;
	npc.setNav();
	npc.addLocTarget( safeLoc );
	*/
	//console.log("NPC new nav loc is " + nav.targetAsLocation);
    }
}

exports.init_npcs = function( npcs ) {
    _npcs = npcs;
}

exports.init_guards = function( guards ) {
    _guards = guards;
}

function pd( params, sender ) {
    var cmd = params[0];

    switch( cmd ) {
    case "dnpc":
	debug_npc( params, sender );
	break;
    default:
	echo(sender, cmd + " is not a valid command");
	echo(sender, "Use TAB to see a list of valid commands");	
	break;
    }
}

command(pd, commands);
