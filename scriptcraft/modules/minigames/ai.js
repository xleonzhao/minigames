load("nashorn:mozilla_compat.js");
importPackage(java.util);
importPackage(java.lang.Thread);

importPackage(Packages.net.citizensnpcs.api);
var Citizen  = Packages.net.citizensnpcs.api;
importPackage(Packages.net.citizensnpcs.api.astar.pathfinder);
var PathFinder = Packages.net.citizensnpcs.api.astar.pathfinder;

var Bukkit = org.bukkit.Bukkit;
var utils  = require('utils');

var npcclass  = require('minigames/npc.js');
var playercls = require('minigames/player.js');
var pvsutil   = require('minigames/util.js');
var pvscfg    = require('minigames/pvs_cfg.js');
var cfg       = pvscfg.loadConfig();

var game;
var npcs = [];
var start_player;

var timeBetweenAIRuns = 60;
var minHealth = 8;
var safeDistance = 20;
var total_round   = 1;
var current_round = 1;

function runAI() {
    //console.log( "AI is running" );

    var allNPCDead = true;
    for ( i=0; i<npcs.length; i++ ) {
	var npc = npcs[ i ];

	if( npc.isDead() ) continue;
	allNPCDead = false;

	npc.runAI();
	
	if( config.verbose && 0 ) {
	    console.log("[AI] checking NPC " + npc.name);
	    console.log("  - health:   " + npc.getHealth());
	    console.log("  - state:    " + npc.state);
	    console.log("  - attacked: " + npc.isAttacked);
	    console.log("  - targets:  " + npc.getTotalTargets());
	    /*
	    var targets = npc.getTargets();
	    var it = targets.iterator();
	    while( it.hasNext() ) {
		var t = it.next();
		console.log("    - target: " + t.targetID + ", timeleft=" + t.ticksLeft);
	    }
	    */
	}
    }

    if( allNPCDead && npcs.length > 0) {
	current_round++;
	// next wave ...
	console.log("current=" + current_round + ", total=" +total_round);
	if( current_round > total_round ) {
	    task_ai = false;
	    if( cfg.getBoolean( "game.allow_pvp" ) )
		game = null;
	} else {
	    // counting down
	    for(var i=10; i>0; i--) {
		java.lang.Thread.sleep(1000);
		Bukkit.broadcastMessage( org.bukkit.ChatColor.RED + "Time left for next wave: " + i + " seconds");
	    }
	    var game_name = cfg.getString( "game.rounds." + current_round );
	    game.loadNPC( start_player, game_name );
	}
    }
    
    return;
}

function continueAI() {
    return task_ai;
}

function onDone() {
    console.log("AI stopped.");
    if( game ) {
	game.reset();
	Bukkit.broadcastMessage( org.bukkit.ChatColor.RED + "Game Over! Happy Playing!" );
    }
}

var _AI = {
    init: function( _npcs, _game, _player ) {
	npcs = _npcs;
	game = _game;
	start_player = _player;
	task_ai = false;
	if( ! cfg ) {
	    cfg = pvs_cfg.loadConfig();
	    if( ! cfg )
		return;
	}
	total_round = cfg.getInt( "game.rounds.total" );
	current_round = 1;
    },

    reload: function( _npcs ) {
	npcs = _npcs;
    },
    
    run: function() {
	task_ai = true;
	if( npcs.length <= 20 )
	    utils.nicely(runAI, continueAI, onDone, timeBetweenAIRuns);
	else if( npcs.length <= 40 )
	    utils.nicely(runAI, continueAI, onDone, timeBetweenAIRuns + 30);
	else if(npcs.length <=60 )
	    utils.nicely(runAI, continueAI, onDone, timeBetweenAIRuns + 60);
    },

    stop: function() {
	game = null;
	task_ai = false;
	current_round = 1;
    },
}

exports.AI = _AI;
