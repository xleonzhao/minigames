var Bukkit = org.bukkit.Bukkit;

var npcBoard, npcTeam, playerBoard, playerTeam;

function setup_npc_board( npcs ) {
    npcBoard = Bukkit.scoreboardManager.newScoreboard;

    var objHealth = npcBoard.registerNewObjective( "Health", "dummy" );
    objHealth.setDisplaySlot( org.bukkit.scoreboard.DisplaySlot.BELOW_NAME );
    objHealth.setDisplayName( "/ 20" );

    npcTeam = npcBoard.registerNewTeam("NPC");

    for( var i=0; i<npcs.length; i++ ) {
	var npc = npcs[i];

	npc.scoreboard = npcBoard;
	var score = objHealth.getScore( npc );
	score.setScore( npc.getHealth() );

	npcTeam.addPlayer( npc );
    }
}

function setup_player_board( players ) {
    playerBoard = Bukkit.scoreboardManager.newScoreboard;

    var objKill = playerBoard.registerNewObjective( "Kill", "dummy" );
    objKill.setDisplaySlot( org.bukkit.scoreboard.DisplaySlot.SIDEBAR );
    objKill.setDisplayName( "Kill" );

    playerTeam = playerBoard.registerNewTeam("Players");
    // may not need this, but just keep here
    playerTeam.canSeeFriendlyInvisibles = true;
    playerTeam.allowFriendlyFire = false;

    for( var i=0; i<players.length; i++ ) {
	var player = players[i];

	player.scoreboard = playerBoard;
	var score = objKill.getScore( player );
	score.setScore( 0 );
	
	playerTeam.addPlayer( player );
    }
}

function update_npc_score( npc, score ) {
    
}

function update_player_score( player, score ) {
}

function clear_npc_board() {
}

function clear_player_board() {
}

var _pvs_sb = {
    init: function( npcs, players ) {
	setup_npc_board( npcs );
	setup_player_board( players );
    },

    clear: function() {
	clear_npc_board();
	clear_player_board();
    },

    update_npc_score: function( npc, score ) {
	update_npc_score( npc, score );
    },

    update_player_score: function( player, score ) {
	update_player_score( player, score );
    },
}
    
exports.pvs_sb = _pvs_sb;
