/*************************************************************

 *************************************************************/

var Bukkit   = org.bukkit.Bukkit;
var Entity   = org.bukkit.entity;
var Location = org.bukkit.Location;
var Vector   = org.bukkit.util.Vector;

importPackage(java.util);

load("nashorn:mozilla_compat.js");
importPackage(Packages.net.citizensnpcs.api);
var Citizen  = Packages.net.citizensnpcs.api;
importPackage(Packages.net.citizensnpcs.api.astar.pathfinder);
var PathFinder = Packages.net.citizensnpcs.api.astar.pathfinder;

var utils    = require('utils');
var items    = require('items');
var pvsutil  = require('minigames/util.js');

var _plugin      = null;
var _reg         = null;
var _factory     = null;
var equipCls     = null;
var sentinelCls  = null;
var lookCls      = null;
var wayptCls     = null;

var sb = function(cmd){
    Bukkit.dispatchCommand(server.consoleSender, 'scoreboard ' + cmd) 
};

function init_vars() {
    // _plugin     = server.pluginManager.getPlugin("Citizens");
    // _reg        = _plugin.getNPCRegistry();
    // _factory    = _plugin.getTraitFactory();
    _reg     = Citizen.CitizensAPI.getNPCRegistry();
    _factory = Citizen.CitizensAPI.getTraitFactory();
    if( _factory ) {
	equipCls    = _factory.getTraitClass("Equipment");
	sentinelCls = _factory.getTraitClass("Sentinel");
	lookCls     = _factory.getTraitClass("LookClose");
	invCls      = _factory.getTraitClass("Inventory");
	wayptCls    = _factory.getTraitClass("Waypoints");
    }
}

var pvscfg   = require('minigames/pvs_cfg.js');
var cfg      = pvscfg.loadConfig();
//var defaultSpawnLoc = new Location( utils.world(), 0, 0, 0 );
//var defaultSpawnLoc = new Location( utils.world(), -165, 89, -316 );
var safeRadius = 30;

var npccls   = require('minigames/npc.js');
var ihfunc   = require('minigames/inherits.js');

// class declaration and inherits
function Sentinel(type, level) {

    Sentinel._super.constructor.call( this );
    
    if( type === undefined )
	this.type = "soldier";
    else
	this.type = type;
    
    if( level === undefined)
	this.level = 1;
    else
	this.level = level;
    
    this.npc = null;
    this.equipTrait = null;
    this.invTrait   = null;
    this.stlTrait   = null;
    this.wpTrait    = null;

    this.isAttacked = false;
    this.attacker   = null;
    this.prevHealth = 20;
    this.safeLoc    = null;
}

ihfunc.inherits(Sentinel, npccls.NPC);
init_vars();

// methods
Sentinel.prototype.createNPC = function() {
    if ( ! _factory )
	init_vars();

    var _npc =  _reg.getById( this.id );
    if( _npc ) {
 	console.log("NPC " + this.id + " already exist, destroy it then create a new one");
	_npc.destroy();
    }

    _npc = _reg.createNPC(Entity.EntityType.PLAYER, java.util.UUID.randomUUID(), this.id, this.name);
    if ( ! _npc ) {
	console.log("Create NPC " + this.id + " failed");
	return null;
    }
	
    this.npc  = _npc;
}

Sentinel.prototype.spawnNPC = function( spawn ) {
    if( ! this.npc ) {
	console.log("NPC is not created yet");
	return;
    }
    
    var npc   = this.npc;
    var type  = this.type;
    var level = this.level;
    
    if( ! spawn ) {
	console.log("no spawn place, can't spawn it.");
	return null;
    }
	
    if( ! npc.spawn( spawn ) ) {
	console.log("Error: failed to spawn NPC at " + spawn.toString());
	this.npc.destroy();
	return null;
    }
    if( config.verbose )
	console.log("Spawn NPC at " + spawn.toString());
    
    // equip NPC
    if(! npc.hasTrait(invCls) ){
	npc.addTrait(invCls);
    }
    var inv = npc.getTrait(invCls);
    if( ! inv ) {
	console.log("Failed to get Inventory trait, NPC can only be soldier.");
    } else {
	this.invTrait = inv;
    }

    if(! npc.hasTrait(equipCls) ){
	npc.addTrait(equipCls);
    }

    var equip = npc.getTrait(equipCls);
    if( ! equip ) {
	console.log("Failed to get Equipment trait, NPC won't get equipped.");
    } else {
	this.equipTrait = equip;
	this.equipNPC();
    }
    
    // set NPC as a sentinel
    if(! npc.hasTrait(sentinelCls) ) {
	npc.addTrait(sentinelCls);
    }
    
    var sentinel = npc.getTrait(sentinelCls);
    if( ! sentinel ) {
	console.log("Failed to get Sentinel trait, install Sentinel plugin to fix it");
    } else {
	this.stlTrait = sentinel;
	this.sentinelNPC();
    }

    if(! npc.hasTrait(wayptCls) ){
	npc.addTrait(wayptCls);
    }
    
    var wp = npc.getTrait(wayptCls);
    if( ! wp ) {
	console.log("Failed to get Waypoints trait, NPC won't wonder.");
    } else {
	this.wpTrait = wp;
    }

    // other settings
    npc_misc_settings( npc );
};

Sentinel.prototype.setFlocking = function( radius ) {
    if( ! this.npc )
	return;

    var npc = this.npc;
    var flock    = new Citizen.ai.flocking.RadiusNPCFlock( radius );
    var separate = new Citizen.ai.flocking.SeparationBehavior( Citizen.ai.flocking.Flocker.HIGH_INFLUENCE );
    var cohesion = new Citizen.ai.flocking.CohesionBehavior(   Citizen.ai.flocking.Flocker.LOW_INFLUENCE );
    var alignmnt = new Citizen.ai.flocking.AlignmentBehavior(  Citizen.ai.flocking.Flocker.LOW_INFLUENCE );
    var flocking = new Citizen.ai.flocking.Flocker( npc, flock, separate, cohesion, alignmnt );

    npc.navigator.localParameters.addRunCallback( flocking );

    if( config.verbose )
	console.log( npc.name + " will try to keep distance from others when flocking." );
};

function npc_misc_settings( npc ) {
    // set npc not swim, so they will not stuch in water, odd though
    // 9/18/2017: we don't want npc drown anyway.
    npc.data().set("swim", true);
    npc.flyable = false;

    // ignored targets won't hurt this NPC
    // # Whether NPCs are protected from damage by ignore targets.
    // 8/2/2017: still need be false otherwise NPC won't be damaged by anybody
    /* from Citizen source code:
	* A helper method for using {@link #DEFAULT_PROTECTED_METADATA} to set the NPC as protected or not protected from
        * damage/entity target events. Equivalent to
        * <code>npc.data().set(NPC.DEFAULT_PROTECTED_METADATA, isProtected);</code>
	*/
    npc.setProtected( false );

    // important to set range to a large number or NPC will teleport
    // but not too large, e.g. 1000 will make server lagging
    //var navDef = npc.navigator.defaultParameters;
    //navDef.range( 100 ); 
}

Sentinel.prototype.destroy = function() {
    if( ! this.npc ) 
	return;

    var npc = this.npc;
    
    npc.destroy();
    
    if( ! Sentinel._super )
	console.log("No super class defined");
    else
	Sentinel._super.destroy.call(this);
};

Sentinel.prototype.addLocTarget = function( loc ) {
    if( ! this.npc ) {
	console.log("npc is null");
	return;
    }
    var npc = this.npc;
    var nav = npc.navigator;
/*    
    if( nav.isNavigating() ) {
	nav.cancelNavigation();
	if( config.verbose )
	    console.log(" already navigating, cancel it");
    }
*/  
    nav.target = loc;

    if( config.verbose && 0 )
	console.log("set new destination " + loc + " for NPC " + npc.name);
}

Sentinel.prototype.checkLocTarget = function() {
    if( ! this.npc )
	return;

    var npc = this.npc;
    var nav = npc.navigator;

    if( ! nav.pathStrategy ) {
	console.log("no path strategy?");
	return;
    }

    if( ! nav.pathStrategy.update() ) {
	console.log("pathfinder not finished");
	var cancelled = nav.pathStrategy.cancelReason;
	if( cancelled ) 
	    console.log("cancel reason length: " + cancelled.values().length);
    } else {
	console.log("pathfinder is done");
    
	var path = nav.pathStrategy.path;
	if( path ) {
	    for(var i=path.iterator(); i.hasNext();) {
		var v = i.next();
		console.log(" path vector is " + v);
	    }
	} else {
	    console.log(" path is null to the target ");
	}
    }
}

Sentinel.prototype.stopNav = function() {
    if( ! this.npc )
	return;

    var npc   = this.npc;
    npc.navigator.cancelNavigation();
}

Sentinel.prototype.setNav = function() {
    if( ! this.npc )
	return;

    var npc   = this.npc;
    var level = this.level;
    var wp    = this.wpTrait;
    
    var navLoc = npc.navigator.localParameters;    
    var speedmod = cfg.getDouble("level" + level + ".speed", 1.0);

    navLoc.speedModifier( speedmod );
    navLoc.avoidWater( true );
    navLoc.stuckAction( null );

    // important to set range to a large number or NPC will teleport
    // but not too large, e.g. 1000 will make server lagging
    navLoc.range( 50 );

    // TODO: further providing NPC teleporting
    //wp.

    navLoc.useNewPathfinder( false );
    //navLoc.stuckAction( Packages.net.citizensnpcs.api.ai.TeleportStuckAction.INSTANCE );
}

Sentinel.prototype.turnAround = function() {
    if( ! this.npc )
	return;

    var npc = this.npc;
    var loc = npc.entity.location;

    if( loc.yaw >= 0 )
	loc.yaw -= 180;
    else
	loc.yaw += 180;
    
    npc.entity.teleport(loc);

    return;
}

Sentinel.prototype.findSafeLoc = function() {
    if( ! this.npc )
	return;

    var npc = this.npc;

    if( ! npc.entity.isOnGround() ) {
	// pathfinder doesn't like it if npc is not on ground and we started nav
	return null;
    }
    
    var loc = npc.entity.location;
    var attacker = this.attacker;
    var vec = null;
    
    if( ! attacker ) {
	var dir = loc.direction;
	vec = new Vector( 0-dir.x, 0.0, 0-dir.z );
	if( config.verbose )
	    console.log(" no attacker found, fleeing opposite direction");
    } else {
	vec = loc.toVector().subtract( attacker.location.toVector() );
	vec.y = 0.0;

	if( config.verbose )
	    console.log(" flee away from " + attacker + " at " + attacker.location );
    }

    vec.normalize().multiply( safeRadius );

    if( config.verbose ) {
	console.log(" NPC current loc is " + loc);
	console.log(" flee vec is " + vec);
    }
    
    var new_loc = loc.clone().add( vec );
    var ret = pvsutil.findSafeLocation( new_loc, 10 );
    var found = ret[1];
    var safeLoc = ret[0];
    
    if( ! found ) {
	var new_vec = vec.clone().multiply( new Vector(-1.0, 0.0, 1.0) );
	new_loc = loc.clone().add( new_vec );

	ret = pvsutil.findSafeLocation( new_loc, 10 );
	safeLoc = ret[0];
	found = ret[1];
    }
    
    if( ! found ) {
	var new_vec = vec.clone().multiply( new Vector(1.0, 0.0, -1.0) );
	new_loc = loc.clone().add( new_vec );

	ret = pvsutil.findSafeLocation( new_loc, 10 );
	safeLoc = ret[0];
	found = ret[1];
    }
    
    if( ! found ) {
	var new_vec = vec.clone().multiply( new Vector(-1.0, 0.0, -1.0) );
	new_loc = loc.clone().add( new_vec );

	ret = pvsutil.findSafeLocation( new_loc, 10 );
	safeLoc = ret[0];
	found = ret[1];
    }

    if( ! found ) {
	safeLoc = pvsutil.getSafeLoc();
    }

    // do this otherwise NPC won't flee.
    this.stlTrait.rangedChase = false;
    this.stlTrait.closeChase = false;
    
    return safeLoc;
}

Sentinel.prototype.lookclose = function( flag ) {
    if( ! this.npc )
	return;

    var npc = this.npc;
    
    if(! npc.hasTrait(lookCls) ){
	npc.addTrait(lookCls);
    }
    
    var look = npc.getTrait(lookCls);
    if( ! look) {
	console.log("Failed to get LookClose trait, NPC won't look player.");
	return;
    }
    look.lookClose( flag );
};

Sentinel.prototype.wandering = function( flag ) {
    var npc = this.npc;
    var wp  = this.wpTrait;

    if( ! npc || ! wp )
	return;

    if( flag ) 
	wp.setWaypointProvider( "wander" );
    else
	wp.setWaypointProvider( "linear" );
}    

Sentinel.prototype.getHealth = function() {
    var npc = this.npc;
    var sentinel = this.stlTrait;

    if( ! this.npc || ! sentinel )
	return -1;

    var health   = sentinel.getLivingEntity().getHealth();
    return health;
};

Sentinel.prototype.isDead = function() {
    if( ! this.npc )
	return true;

    return (! this.npc.isSpawned());
}

Sentinel.prototype.getCurrentLocation = function() {
    if( ! this.npc )
	return null;
    
    return this.npc.entity.location;
}

Sentinel.prototype.addPlayerTarget = function( player_name ) {
    var npc      = this.npc;
    var sentinel = this.stlTrait;;

    if( ! npc || ! sentinel || this.isDead() ) {
	return;
    }

    sentinel.playerNameTargets.add( player_name );
    sentinel.closeChase = true;
    
    if(config.verbose)
	console.log(this.name + " adds player " + player_name + " as the target");
};

Sentinel.prototype.addNPCTarget = function( npc_name ) {
    var npc      = this.npc;
    var sentinel = this.stlTrait;
    
    if( ! npc || ! sentinel || this.isDead() ) {
	return;
    }

    this.removeAllTargets();
    sentinel.npcNameTargets.add( npc_name );
    sentinel.closeChase = true;
    
    if(config.verbose)
	console.log(this.name + " adds NPC " + npc_name + " as the target");
}

Sentinel.prototype.removeAllTargets = function() {
    var npc      = this.npc;
    var sentinel = this.stlTrait;
    
    if( ! npc || ! sentinel ) {
	return;
    }

    sentinel.currentTargets.clear();
    sentinel.targets.clear();
    sentinel.playerNameTargets.clear();
    sentinel.npcNameTargets.clear();

    if(config.verbose)
	console.log("Removing " + npc.name + "'s all targets");
}

Sentinel.prototype.getTotalTargets = function() {
    var npc      = this.npc;
    var sentinel = this.stlTrait;
    var total    = 0;
    
    if( ! npc || ! sentinel ) {
	return total;
    }

    total += sentinel.currentTargets.size();
    // TODO: does currentTargets already included following ?
    //total += sentinel.targets.size();
    //total += sentinel.playerNameTargets.size();
    //total += sentinel.npcNameTargets.size();

    if( config.verbose )
	console.log( this.name + " has " + total + " targets");
    
    return total;
};

Sentinel.prototype.equipNPC= function() {
    var type  = this.type;
    var level = this.level;
    var equip = this.equipTrait;
    if( ! equip ) {
	console.log("failed to find equipTrait");
	return;
    }
    
    // weapons
    switch( type ) {
    case "soldier":
	switch( level ) {
	case 1:
	    equip.set(0, items.woodSword(1));
	    break;
	case 2:
	    equip.set(0, items.goldSword(1));
	    break;
	case 3:
	    equip.set(0, items.stoneSword(1));
	    break;
	case 4:
	    equip.set(0, items.ironSword(1));
	    break;
	case 5:
	    equip.set(0, items.diamondSword(1));
	    break;
	default:
	    equip.set(0, items.woodSword(1));
	    break;
	}  
	break;
    case "archier":
	var inv   = this.invTrait;
	if( ! inv ) {
	    console.log("failed to find equipTrait");
	    break;
	}
	
	switch( level ) {
	default:
	    equip.set(0, items.bow(1));
	    var itemStack = inv.contents;
	    itemStack.type = items.arrow(64);
	    break;
	}
	break;
    case "witcher":
	switch( level ) {
	default:
	    equip.set(0, items.blazeRod(1));
	    //var itemStack = inv.contents;
	    //itemStack.type = items.arrow(64);
	    break;
	}
	break;
    default:
	console.log("invalid weapon config");
	break;
    }

    // armor
    switch(level) {
    case 1:
	equip.set(1, items.leatherHelmet(1));
	equip.set(2, items.leatherChestplate(1));
	equip.set(3, items.leatherLeggings(1));
	equip.set(4, items.leatherBoots(1));
	break;
    case 2:
	equip.set(1, items.goldHelmet(1));
	equip.set(2, items.goldChestplate(1));
	equip.set(3, items.goldLeggings(1));
	equip.set(4, items.goldBoots(1));
	break;
    case 3:
	equip.set(1, items.chainmailHelmet(1));
	equip.set(2, items.chainmailChestplate(1));
	equip.set(3, items.chainmailLeggings(1));
	equip.set(4, items.chainmailBoots(1));
	break;
    case 4:
	equip.set(1, items.ironHelmet(1));
	equip.set(2, items.ironChestplate(1));
	equip.set(3, items.ironLeggings(1));
	equip.set(4, items.ironBoots(1));
	break;
    case 5:
	equip.set(1, items.diamondHelmet(1));
	equip.set(2, items.diamondChestplate(1));
	equip.set(3, items.diamondLeggings(1));
	equip.set(4, items.diamondBoots(1));
	break;
    case 6:
	equip.set(1, items.leatherHelmet(1));
	equip.set(2, items.leatherChestplate(1));
	equip.set(3, items.leatherLeggings(1));
	equip.set(4, items.leatherBoots(1));
	break;
    default:
	console.log("Error: level " + level + " is invalid in npc_equip()");
    }
    
}

Sentinel.prototype.sentinelNPC = function() {
    var level    = this.level;
    var sentinel = this.stlTrait;
    if( ! sentinel ) {
	console.log(" failed to find sentinel trait" );
	return;
    }
    
    //make the following fixed, not configurable.
    sentinel.damage = -1.0; // let computer calculate the damage
    sentinel.armor  = -1.0; // let computer calculate the armor
    sentinel.health = 20;   // same as player's health in survival mode
    sentinel.fighback = true;
    sentinel.autoswitch = true;
    sentinel.respawnTime  = 0; // no respawn

    switch(level) {
    case 1:
	sentinel.attackRate = cfg.getInt("level1.attackRate");
	sentinel.healRate   = cfg.getInt("level1.healRate");
	sentinel.accuracy   = cfg.getInt("level1.accuracy");
	sentinel.speed      = cfg.getDouble("level1.speed", 1.0);
	break;
    case 2:
	sentinel.attackRate = cfg.getInt("level2.attackRate");
	sentinel.healRate   = cfg.getInt("level2.healRate");
	sentinel.accuracy   = cfg.getInt("level2.accuracy");	
	sentinel.speed      = cfg.getDouble("level2.speed", 1.0);
	break;
    case 3:
	sentinel.attackRate = cfg.getInt("level3.attackRate");
	sentinel.healRate   = cfg.getInt("level3.healRate");
	sentinel.accuracy   = cfg.getInt("level3.accuracy");
	sentinel.speed      = cfg.getDouble("level3.speed", 1.0);
	break;
    case 4:
	sentinel.attackRate = cfg.getInt("level4.attackRate");
	sentinel.healRate   = cfg.getInt("level4.healRate");
	sentinel.accuracy   = cfg.getInt("level4.accuracy");
	sentinel.speed      = cfg.getDouble("level4.speed", 1.0);
	break;
    case 5:
	sentinel.attackRate = cfg.getInt("level5.attackRate");
	sentinel.healRate   = cfg.getInt("level5.healRate");
	sentinel.accuracy   = cfg.getInt("level5.accuracy");
	sentinel.speed      = cfg.getDouble("level5.speed", 1.0);
	break;
    default:
	console.log("Error: level " + level + " is invalid in npc_sentinel");
    }
}

exports.Sentinel = Sentinel;
