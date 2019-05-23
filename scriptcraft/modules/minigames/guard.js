/*************************************************************

 *************************************************************/

var pvscfg   = require('minigames/pvs_cfg.js');
var cfg      = pvscfg.loadConfig();

var stlcls   = require('minigames/sentinel.js');
var ihfunc   = require('minigames/inherits.js');

// class declaration and inherits
function Guard( type, level, player, gid ) {

    Guard._super.constructor.call( this, type, level );
    this.player   = player;
    this.guard_id = gid;
}

ihfunc.inherits(Guard, stlcls.Sentinel);

// methods

Guard.prototype.spawnNPC = function() {
    var player = this.player;
    var loc = player.location;
    
    //var rand = new java.util.Random();
    var xi = this.guard_id % 5;
    var zi = java.lang.Math.floor((this.guard_id) / 5);
    var spawn = player.location.add( xi*2+1, 0, -zi*2+1);

    Guard._super.spawnNPC.call( this, spawn );

};

Guard.prototype.guardPlayer = function() {
    var npc      = this.npc;
    var sentinel = this.stlTrait;
    var player   = this.player;

    if( ! npc || ! sentinel ) {
	return;
    }

    this.removeAllTargets();
    var uuid = player.uniqueId;
    sentinel.setGuarding( uuid );
    /*
    var uuid = player.uniqueId;
    sentinel.guardingUpper = uuid.getMostSignificantBits();
    sentinel.guardingLower = uuid.getLeastSignificantBits();
    */
    
    if(config.verbose)
	console.log("Guarding player " + player.name + " (" + uuid + ")");
};

Guard.prototype.unGuardPlayer = function() {
    var npc      = this.npc;
    var sentinel = this.stlTrait;
    var player   = this.player;

    if( ! npc || ! sentinel ) {
	return;
    }

    sentinel.setGuarding( null );
    
    if(config.verbose)
	console.log("Unguarding player " + player.name);
};

Guard.prototype.targetAllNPCs = function() {
    var npc      = this.npc;
    var sentinel = this.stlTrait;

    if( ! npc || ! sentinel ) {
	return;
    }

    sentinel.targets.add( "NPC" );
    
    if(config.verbose)
	console.log("guard " + this.name + " is targeting all NPCs");
}

Guard.prototype.ignoreOwner = function() {
    var npc      = this.npc;
    var sentinel = this.stlTrait;
    var player   = this.player;

    if( ! npc || ! sentinel ) {
	return;
    }

    sentinel.playerNameIgnores.add( player.name );

    if(config.verbose)
	console.log("guard " + this.name + " won't fight its owner " + player.name);
}

Guard.prototype.ignoreAllGuards = function( guards ) {
    var npc      = this.npc;
    var sentinel = this.stlTrait;

    if( ! npc || ! sentinel ) {
	return;
    }

    for( var p in guards) {
	var gs = guards[ p ];
	for( var i=0; i<gs.length; i++ ) {
	    sentinel.npcNameIgnores.add( gs[i].name );
	}
    }

    if(config.verbose)
	console.log("guard " + this.name + " won't fight all other guards");
}

Guard.prototype.ignoreMyGuards = function( guards ) {
    var npc      = this.npc;
    var sentinel = this.stlTrait;
    var player   = this.player;

    if( ! npc || ! sentinel ) {
	return;
    }

    for( var i=0; i<guards.length; i++ ) {
	sentinel.npcNameIgnores.add( guards[i].name );
    }

    if(config.verbose)
	console.log("guard " + this.name + " won't fight other guards owned by " + player.name);
}

exports.Guard = Guard;
