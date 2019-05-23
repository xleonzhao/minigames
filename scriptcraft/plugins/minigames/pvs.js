var Bukkit     = org.bukkit.Bukkit;
var Entity     = org.bukkit.entity;
var EntityType = org.bukkit.entity.EntityType;
var Location   = org.bukkit.Location;

load("nashorn:mozilla_compat.js");
importPackage(java.util);
importPackage(Packages.net.citizensnpcs.api);
var Citizen  = Packages.net.citizensnpcs.api;

var utils      = require('utils');
var inventory  = require('inventory');
var items      = require('items');

var pvscfg     = require('minigames/pvs_cfg.js');
var npcCls     = require('minigames/npc.js');
var villainCls = require('minigames/villain.js');
var guardCls   = require('minigames/guard.js');
var playerCls  = require('minigames/player.js');
var AI         = require('minigames/ai.js').AI;
var pvsdebug   = require('minigames/pvs_debug.js');

var max_level  = 5;
var npc_types  = ["soldier", "archier", "witcher" ];
var max_npcs   = 50;
var max_guards_per_player = 10;
var npcs       = [];
var named_npcs = [];
var splayers   = [];
var guards     = {};
var cfg;
var flocking_radius = 10.0;

var commands = ["init", "start", "prompt", "guards"];
var default_level = 5;
var state = 0; //0: not init'd; 1: init'd but not started; 2: started
var currentRound = 1;

var sb = function(cmd){
    Bukkit.dispatchCommand(server.consoleSender, 'scoreboard ' + cmd) 
};

var pvs_sb = {
    init: function() {
	Bukkit.dispatchCommand(server.consoleSender, 'gamerule sendCommandFeedback false');

	sb('objectives remove npc_health');
	sb('objectives remove kills');

	sb('objectives add npc_health dummy / 20');
	sb('objectives add kills dummy Kills');
	sb('objectives setdisplay belowName npc_health');
	sb('objectives setdisplay sidebar kills');
    },

    clear: function() {
	Bukkit.dispatchCommand(server.consoleSender, 'gamerule sendCommandFeedback true');
    },
};

function _loadNPC( player, name ) {
    var npcc = 0;
    var gameCfg = name;
    npcs = [];
    named_npcs = [];
    var radius  = flocking_radius;

    // set NPC spawn location as player's location + (3, 0, 3)
    // need randomize it.

    var init_loc = player.location.add( 3, 0, 3);
    //var init_loc = new Location( utils.world(), -165, 89, -316 );

    
    for( var t = 0; t<npc_types.length && npcc<max_npcs; t++ ) {
	var type = npc_types[t];

	for( var i = 1; i <= max_level && npcc<max_npcs; i++ ) {
	    
	    var level = "level" + i;
	    var npc_num = cfg.getInt("game." + gameCfg + "." + type + "." + level);
	    if(config.verbose && npc_num>0 )
		console.log("creating " + npc_num + " level " + i + " " + type + " NPCs");
	    
	    for(var j=0; j < npc_num; j++) {

		var new_npc = new villainCls.Villain( type, i );
		if (! new_npc) {
		    console_log("Error found when creating NPCs. Initialization failed");
		    stop(player);
		    return;
		}
		
		var xi = npcc % 5;
                var zi = java.lang.Math.floor(npcc / 5);
		var spawn_loc = init_loc.clone();
		spawn_loc.add(xi*2 + 1, 0, zi * 2 + 1);

		new_npc.createNPC();
		new_npc.spawnNPC( spawn_loc, npcc );
		new_npc.setFlocking( radius );

		npcs[ npcc++ ] = new_npc;
		named_npcs[ new_npc.name ] = new_npc;
		
		sb('players set ' + new_npc.name + ' npc_health 20');
		
		if(npcc >= max_npcs) {
		    console.log("Warning: too many NPCs, the max allowed is " + max_npcs);
		    break;
		}
	    }
	}
    }

    AI.reload( npcs );

    currentRound++;
    console.log("currentRound=" + currentRound);
    player.sendMessage("Done. There are " + npcc + " is ready to fight");

}

var pvsgame = {
    loadNPC: function( player, name ) {
	_loadNPC( player, name );
    },
    
    init: function(player){
	if( state != 0 ) {
	    player.sendMessage('Game is probably already initialized or started, stop it first');
	    return;
	}
	
        player.sendMessage('Initializing the game ...');
	cfg = pvscfg.loadConfig();
	if(!cfg) {
	    console.log('failed to load config file ' + cfgFile);
	    return;
	}

	// init scoreboard
	pvs_sb.init();
	
	current_round = 1;
	var game_name = cfg.getString("game.config");
	if( game_name == "rounds" )
	    game_name = cfg.getString( "game.rounds." + currentRound );

	_loadNPC( player, game_name );

	AI.init( npcs, pvsgame, player );
	pvsdebug.init_npcs( named_npcs );
	
	var pcnt = 0;
	utils.players( function( p ) {

	    pcnt++;
	    if( pcnt > max_npcs ) {
		console.log("Warning: too many players, the max allowed is " + max_npcs);
		return;
	    }
	    
	    // save player's current settings
	    var scp = new playerCls.savePlayer( p );
	    var pLevel = cfg.getInt("game." + game_name + "." + "player.level", default_level);
	    scp.gameSetup( pLevel ); 
	    splayers[ p.name ] = scp;
	    inventory( p )
		.add( items.goldenApple(16) )
		.add( items.bow(1) )
		.add( items.arrow(64) )
	    
	    sb('players set ' + p.name + ' kills 0');
	    
	    if( config.verbose)
		console.log("Setup player " + p.name + " to level " + pLevel);
	});

	// whoever init'd the game is the Op
	player.setOp(true);

	state = 1;
    },

    start: function(player) {
	if ( state != 1 ) {
	    player.sendMessage("Game not initialized. Do 'jsp pvs init' first");
	    return;
	}

	for(var i = 0; i < npcs.length; i++) {
	    var npc = npcs[i];
	    npc.lookclose();
	    npc.targetAllPlayers();
	    npc.ignoreAllNPCs( npcs );
	}

	for( var p in guards ) {
	    if( guards.hasOwnProperty( p ) ) {
		var gs = guards[ p ];
		    
		for( var i=0; i<gs.length; i++ ) {
		    // when game started, guards started with either
		    // guarding the player, or fighting NPCs
		    gs[i].guardPlayer();
		    //gs[i].targetsAllNPCs();
		}
	    }
	}
   
	AI.run();
	register_events();
	state = 2;

	player.sendMessage('Game Started!');
    },

    /*
    stop: function(player) {
	if ( state != 2 ) {
	    player.sendMessage("Game not started yet. Do 'jsp pvs start'");
	    return;
	}

	reset_game();
    },
    */

    reset: function() {
	// reset game whatsoever
	reset_game();
    },

    prompt: function( params, sender ) {
	var player_name = params[1];
	var rank = params[2];

	if( ! sender.isOp() ) {
	    sender.sendMessage("only op can do this")
	    return;
	}

	var player = server.getPlayer( player_name );
	if( ! player ) {
	    sender.sendMessage( "Player " + player_name + " does not exist" );
	    return;
	}
	if( ! player.isOnline() ) {
	    sender.sendMessage( "Player " + player + " is not online" );
	    return;
	}
	
	// read rank from config
	if( ! cfg )
            cfg = pvscfg.loadConfig();
	if( ! cfg ) {
	    console.log('failed to load config file ' + cfgFile);
	    return;
	}

	var radius = flocking_radius;
	var guards_cnt = 0;
	guards[ player_name ] = [];
	
	for( var t = 0; t<npc_types.length && guards_cnt<max_guards_per_player; t++ ) {
	    var type = npc_types[t];

	    for( var i = 1; i <= max_level && guards_cnt<max_guards_per_player; i++ ) {
		
		var level = "level" + i;
		var guard_num = cfg.getInt("ranks." + rank + "." + type + "." + level);
		
		for(var j=0; j < guard_num; j++) {
		    
		    var new_npc = new guardCls.Guard( type, i, player, guards_cnt );
		    if (! new_npc) {
			console_log("Error found when creating NPCs. Initialization failed");
			stop( sender );
			return;
		    }

		    new_npc.createNPC();
		    new_npc.spawnNPC();
		    new_npc.setFlocking( radius );
		    
		    guards[player_name][ guards_cnt ] = new_npc;

		    if(config.verbose)
			console.log("created a level " + i + " " + type + " for player " + player_name);

		    guards_cnt++;
		    if(guards_cnt >= max_guards_per_player) {
			console.log("Warning: too many guards, the max allowed is " + max_guards_per_player);
			break;
		    }
		}
	    }
	}

	var gs = guards[ player_name ];
	for( var i=0; i<gs.length; i++ ) {

	    gs[i].ignoreOwner();
	    
	    if( cfg.getBoolean("game.allow_pvp") ) {
		// if allow player vs player, guards owned by
		// same player won't fight each other.
		gs[i].ignoreMyGuards( gs );
	    } else {
		// if not allow player vs player, all guards 
		// won't fight each other.
		gs[i].ignoreAllGuards( guards );
	    }
	}

	pvsdebug.init_guards( guards );
	
    },

    guards_cmd: function( params, sender ) {
	var cmd = params[1];
	var target = params[2];

	console.log("sender is " + sender);
	var mygs = guards[ sender.name ];
	if ( ! mygs || mygs.length<1 ) {
	    console.log(sender.name + " do not have any guards");
	    return;
	}

	switch( cmd ) {
	case "charge":
	    for( var i=0; i<mygs.length; i++ ) {
		var guard = mygs[i];

		guard.unGuardPlayer();

		if( ! target ) {
		    guard.targetAllNPCs();
		} else {
		    var isNum = target.matches("-?\\d+(\\.\\d+)?");
		    if( isNum ) {
			var num = java.lang.Integer.parseInt( target );
			target = npcCls.NPC.id_to_name( num );
			guard.addNPCTarget( target );
			continue;
		    }
		    
		    var target_player = server.getPlayer( target );
		    if( target_player ) {
			guard.addPlayerTarget( target );
		    } else {
			guard.addNPCTarget( target );
		    }
		}
	    }
	    break;
	case "guard":
	    for( var i=0; i<mygs.length; i++ ) {
		var guard = mygs[i];

		guard.removeAllTargets();
		guard.guardPlayer();
	    }
	    break;
	default:
	    sender.sendMessage("command " + cmd + " is invalid.");
	    sender.sendMessage("valid guards commands are 'charge' or 'guard'");
	    break;
	}
    },
};

function reset_game() {

    unregister_events();
    AI.stop();
    currentRound = 1;
    
    for( var i=0;  i < npcs.length; i++ )
	if (npcs[i]) 
	    npcs[i].destroy();


    for( var p in guards ) {
	if( guards.hasOwnProperty(p) )
	    var gs = guards[p];
	    for( var i=0; i<gs.length; i++) {
		gs[i].destroy();
	    }
    }
			 
    var tmpNPC = new npcCls.NPC();
    tmpNPC.reset();

    for( var p in splayers ) {
	console.log("restoring player " + p + " states");
	if( splayers[ p ] ) {
	    splayers[ p ].restoreState();
	}
    }
    
    npcs     = [];
    guards   = {};
    splayers = [];
    
    pvs_sb.clear();
    state = 0;

    if( config.verbose )
	console.log("Game is reset.");
}
		 
function onPlayerRespawn( event ) {
    var player = event.player;

    if( ! player instanceof Entity.Player )
	return;
    
    if( config.verbose )
	console.log("Player " + player.name + " respawned, setup again");

    var gameCfg = cfg.getString("game.config");
    if( gameCfg == "rounds" )
	gameCfg = cfg.getString("game.rounds." + current_round);
    
    var pLevel = cfg.getInt("game." + gameCfg + "." + "player.level", default_level);

    var p = splayers[ player.name ];
    if( p ) {
	p.gameSetup( pLevel );
    }
}

function onAttack( event ) {
    var damagee = event.entity;
    var damager = event.damager;

    /* for debugging an event exception problem, try to find offending plugins
    var handlers = event.handlers;
    var listeners = handlers.registeredListeners;
    for ( var i=0; i<listeners.length; i++ ) {
	var listener = listeners[i];;
	console.log("found listener " + listener.plugin.name);
    }

    if( event.isCancelled() ) {
	console.log("event already cancelled");
	return;
    }
    */
    
    if( damagee instanceof Entity.Player && damager instanceof Entity.Player ) {

	// check if both NPCs
	var npc  = named_npcs[ damagee.name ];
	var npcr = named_npcs[ damager.name ];
	if( npc && npcr ) {
	    console.log("NVN: " + npc.name + " attacked by " + npcr.name + ", damage is " + event.finalDamage);
	    //cancel this event
	    event.damage = 0.0;
	    event.cancelled = true;
	    //do the same for guards
	    return;
	}

	if( npc ) {
	    npc.isAttacked = true;
	    npc.attacker = damager;

	    sb('players set ' + npc.name + ' npc_health ' + java.lang.Math.round(npc.getHealth()) );	
	    /*
	      utils.nicely( npc.cleaAttackFlag, 
		      function() { return false },
		      function() { return; },
		      30);
	    */

	    if( config.verbose )
		console.log("NPC " + npc.name + " was attached by " + damager.name);
	    
	    return;
	}

	if( ! cfg ) {
	    cfg = pvscfg.loadConfig();
	    if( ! cfg )
		return;
	}
	if( ! cfg.getBoolean( "game.allow_pvp" ) ) {
	    //check if both players
	    if( splayers[ damagee.name ] && splayers[ damager.name ] ) {
		if( config.verbose )
		    console.log("PVP: " + damagee.name + " attacked by " + damager.name + ", cancel it");
		//cancel this event
		event.damage = 0.0;
		event.cancelled = true;
		//do the same for guards
		return;
	    }
	}
	
	if( config.verbose )
	    console.log(damagee.name + " was attacked by " + damager.name);
    }
}

function reward_player( player ) {
//    var rand = new Random(java.time.Instant.epochSecond);
    var rand = new Random();
    var x = rand.nextInt( 10 );
    var item;

    if( x < 1 )
	item = items.emerald(1);
    else if( x < 4 )
	item = items.ironIngot(1);
    else if( x < 7 )
	item = items.goldIngot(1);
    else if( x < 10 )
	item = items.diamond(1);
    
    if( config.verbose && 0 )
	console.log("x is " + x + ", reward is " + item);

    if( item ) {
	inventory( player )
	    .add( item )
	Bukkit.broadcastMessage( org.bukkit.ChatColor.GREEN + player.name + " was rewarded a " + item.type );
    }
}

function onDeath( event ) {
    var killed = event.entity;
    var killer = killed.killer;

    if( ! killed instanceof Entity.Player || ! killer instanceof Entity.Player )
	return;
    
    if( config.verbose )
	console.log(killed.name + " was killed by " + killer.name);

    var npc = named_npcs[ killed.name ];
    if( npc ) {
	var player = splayers[ killer.name ];
	if( player ) {
	    player.kill++;
	    sb('players set ' + killer.name + ' kills ' + player.kill);
	    reward_player( killer );
	}
	return;
    }

    /*
    npc = named_npcs[ killer.name ];
    if( npc ) {
	npc.kill++;
	sb('players set ' + npc.name + ' kills ' + npc.kill);
    }
    */
    
    return;
}

var handlers = [];
function register_events() {
    var i=0;
    handlers[i++] = events.playerRespawn( onPlayerRespawn );
    handlers[i++] = events.entityDamageByEntity( onAttack );
    handlers[i++] = events.entityDeath( onDeath );

    if( config.verbose )
	console.log("Registered " + i + " events");
}

function unregister_events() {
    for( var i=0; i<handlers.length; i++ )
	handlers[i].unregister();

    if( config.verbose )
	console.log("Unregistered " + handlers.length + " events");
}

function set_alias( sender ) {
    Bukkit.dispatchCommand(sender, 'jsp alias set cn = npc sel {1}; sentinel targets');
    Bukkit.dispatchCommand(sender, 'jsp alias set nl = npc list');
    Bukkit.dispatchCommand(sender, 'jsp alias set rm = npc remove all');
    Bukkit.dispatchCommand(sender, 'jsp alias set d = jsp pd dnpc NPC100');
//    Bukkit.dispatchCommand(server.consoleSender, 'jsp alias set cn = npc sel {1}; sentinel targets');
//    Bukkit.dispatchCommand(server.consoleSender, 'jsp alias set nl = npc list');
//    Bukkit.dispatchCommand(server.consoleSender, 'jsp alias set rm = npc remove all');
}

function pvs( params, sender ) {
    var cmd = params[0];

    switch( cmd ) {
    case "init":
	pvsgame.init(sender);
	break;
    case "start":
	pvsgame.start(sender);
	break;
    case "reset":
	pvsgame.reset();
	break;
    case "prompt":
	pvsgame.prompt( params, sender );
	break;
    case "guards":
	pvsgame.guards_cmd( params, sender );
	break;
    case "alias":
	set_alias( sender  );
	break;
    default:
	echo(sender, cmd + " is not a valid command");
	echo(sender, "Use TAB to see a list of valid commands");	
	break;
    }
}

command(pvs, commands);
