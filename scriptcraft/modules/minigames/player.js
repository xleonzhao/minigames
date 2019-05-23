var items = require('items');

function savePlayer( player ) {
    this.player   = player;
    this.gamemode = player.getGameMode();
    this.health   = player.getHealth();
    this.op       = player.isOp();

    var inv = player.inventory;
    this.itemInMainHand = inv.itemInMainHand;
    this.helmet = inv.helmet;
    this.chestplate = inv.chestplate;
    this.leggings = inv.leggings;
    this.boots = inv.boots;
    this.inventory = [];    
    for(var i = 0; i < 39; i++ ) {
	this.inventory[i] = inv.getItem(i);
    }
    inv.clear();

    // stats
    this.kill = 0;
    
    this.gameSetup = function(level) {
	this.player.setHealth(20);
	this.player.setGameMode(org.bukkit.GameMode.SURVIVAL);
	if( ! player.name.equals("Drew_Drew") ) // backdoor for Drew Drew
	    this.player.setOp(false);

	var inv = this.player.inventory;
	switch(level) {
	case 1:
	    inv.itemInMainHand = items.woodSword(1);
	    inv.helmet = items.leatherHelmet(1);
	    inv.chestplate = items.leatherChestplate(1);
	    inv.leggings = items.leatherLeggings(1);
	    inv.boots = items.leatherBoots(1);
	    break;
	case 2:
	    inv.itemInMainHand = items.goldSword(1);
	    inv.helmet = items.goldHelmet(1);
	    inv.chestplate = items.goldChestplate(1);
	    inv.leggings = items.goldLeggings(1);
	    inv.boots = items.goldBoots(1);
	    break;
	case 3:
	    inv.itemInMainHand = items.stoneSword(1);
	    inv.helmet = items.chainmailHelmet(1);
	    inv.chestplate = items.chainmailChestplate(1);
	    inv.leggings = items.chainmailLeggings(1);
	    inv.boots = items.chainmailBoots(1);
	    break;
	case 4:
	    inv.itemInMainHand = items.ironSword(1);
	    inv.helmet = items.ironHelmet(1);
	    inv.chestplate = items.ironChestplate(1);
	    inv.leggings = items.ironLeggings(1);
	    inv.boots = items.ironBoots(1);
	    break;
	case 5:
	    inv.itemInMainHand = items.diamondSword(1);
	    inv.helmet = items.diamondHelmet(1);
	    inv.chestplate = items.diamondChestplate(1);
	    inv.leggings = items.diamondLeggings(1);
	    inv.boots = items.diamondBoots(1);
	    break;
	default:
	    console.log("Error: invalid level for player");
	    break;
	};
    };

    this.restoreState = function() {
	this.player.health = this.health;
	this.player.gameMode = this.gamemode;
	this.player.op = this.op;

	var inv = this.player.inventory;
	inv.itemInMainHand = this.itemInMainHand;
	inv.helmet = this.helmet;
	inv.chestplate = this.chestplate;
	inv.leggings = this.leggings;
	inv.boots = this.boots;

	/* save whatever he earned ? 
	for( var i=0; i<4; i++ ) {

	}
	*/
	// restore rest of his/her inventoies
	for( var i=0; i<39; i++ ) {
	    inv.setItem(i, this.inventory[i]);
	}
    };
}

exports.savePlayer = savePlayer;
