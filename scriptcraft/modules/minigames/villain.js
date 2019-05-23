/*************************************************************

 *************************************************************/

var Bukkit   = org.bukkit.Bukkit;
var Location = org.bukkit.Location;

var utils    = require('utils');
var pvsutil  = require('minigames/util.js');
var stlcls   = require('minigames/sentinel.js');
var ihfunc   = require('minigames/inherits.js');

var sb = function(cmd){
    Bukkit.dispatchCommand(server.consoleSender, 'scoreboard ' + cmd) 
};

// class declaration and inherits
function Villain(type, level) {

    Villain._super.constructor.call( this, type, level );
    
    this.state = "ready";
    this.safeLoc = null;
    this.kill = 0;
    this.scoreboard = null;
}

ihfunc.inherits(Villain, stlcls.Sentinel);

// methods

Villain.prototype.spawnNPC = function( init_loc, idx ) {
    // figure out spawn loc
    var xi = java.lang.Math.floor(idx / 5);
    var zi = idx % 5;
    var ret = pvsutil.findSafeLocation( init_loc.clone().add(xi*2.0, 0.0, zi*2.0), 5 );
    var spawn = ret[0];

    Villain._super.spawnNPC.call( this, spawn );

    // reset navigation
    this.setNav();
};

Villain.prototype.fightOrFlee = function() {
    // this should be more an AI decision taking into account of
    // npc.health, npc.loc, team.health, player.health, player.loc
    // ...
    // but for now, simplify it to only npc.health

    var fight  = true;
    var health = this.getHealth();
    var level  = this.level;
    var name   = this.name;

    switch( level ) {
    case 1:
	if ( health <= 15 ) fight = false;
	break;
    case 2:
	if ( health <= 13 ) fight = false;
	break;
    case 3:
	if ( health <= 11 ) fight = false;
	break;
    case 4:
	if ( health <= 9 ) fight = false;
	break;
    case 5:
	if ( health <= 8 ) fight = false;
	break;
    default:
	if ( health < minHealth ) fight = false;
	break;
    }

    if( health != this.prevHealth ) {
	sb('players set ' + name + ' npc_health ' + java.lang.Math.round(health));
	this.prevHealth = health;
    }
    
    if( config.verbose && 0 )
	console.log(name + " shall " + (fight ? "fight" : "flee"));

    return fight;
}

Villain.prototype.runAI = function() {
    var name  = this.name;
    
    var fight = this.fightOrFlee();
    var sloc;

    if( ! fight ) {
	if( ! this.state.equals("isFleeing") ) {
	    if( this.getTotalTargets() >= 1 ) 
		this.removeAllTargets();
	    this.stopNav();
	    this.safeLoc = null;
	    
	    sloc = this.findSafeLoc();
	    if( sloc ) {
		this.safeLoc = sloc;

		this.addLocTarget( this.safeLoc );
		this.setNav();

		this.state = "isFleeing";
		if( config.verbose )
		    console.log(name + " start fleeing");
	    }
	} else {
	    /*
	    if( ! this.safeLoc ) {
		sloc = this.findSafeLoc();
		if( sloc )
		    this.safeLoc = sloc;
	    }

	    if( this.safeLoc ) {
		// TODO: it is awkward to set up this again and again, but
		// this is so far the only thing to make NPC fleeing, guess 
		// just took time for NPC's navigator to reset ?
		this.setNav();
		this.addLocTarget( this.safeLoc );
	    }
	    */		
	}
	
	return;
    }
    
    if ( fight ) {
	if( ! this.state.equals("isFighting") ) {
	    this.state = "isFighting";
	    this.safeLoc = null;
	    
//	    if( this.getTotalTargets() < 1 ) {
		this.targetAllPlayers();;
		
		if( config.verbose )
		    console.log("  " + name + " targets all players");
//	    }
	}
    }
}

Villain.prototype.targetAllPlayers = function() {
    var npc = this.npc;
    var stl = this.stlTrait;
    if( ! npc || ! stl )
	return;
    
    stl.closeChase = true;
    stl.targets.add( "PLAYER" );

    if( config.verbose && 0)
	console.log("set new destination " + loc + " for NPC " + npc.name);
}

Villain.prototype.ignoreAllNPCs = function( npcs ) {
    var npc = this.npc;
    var stl = this.stlTrait;
    if( ! npc || ! stl )
	return;

    // remove ignore OWNER
    stl.ignores.clear();
    for( var i=0; i<npcs.length; i++ ) {
	if( i==this.relative_id )
	    continue;
	else
	    stl.npcNameIgnores.add( npcs[i].name );
    }
}

exports.Villain = Villain;
