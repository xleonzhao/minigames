load("nashorn:mozilla_compat.js");
importPackage(java.util);

var Bukkit = org.bukkit.Bukkit;
var Block  = org.bukkit.block;

function isSafeLocation( location ) {
    var feet = location.getBlock();
    if (!feet.getType().isTransparent() && !feet.getLocation().add(0, 1, 0).getBlock().getType().isTransparent()) {
	return false; // not transparent (will suffocate)
    }
    var head = feet.getRelative( Block.BlockFace.UP );
    if (!head.getType().isTransparent()) {
	return false; // not transparent (will suffocate)
    }
    var ground = feet.getRelative( Block.BlockFace.DOWN );
    if (!ground.getType().isSolid()) {
	return false; // not solid
    }
    return true;
}
exports.isSafeLocation = isSafeLocation;

exports.findSafeLocation = function( location, radius ) {
    var stop = false;
    var retry = 10;
    //var rand = new Random(java.time.Instant.epochSecond);
    var rand = new Random();
    var safeLoc = location;
    var found = false;
    
    while( ! stop ) {
	stop = isSafeLocation( safeLoc );
	found = stop;
	
	if( config.verbose & 0 )
	    console.log("findSafeLocation: location=[" + safeLoc.x + "," + safeLoc.y + "," + safeLoc.z + "] is safe? " + stop);

	if( ! stop ) {
	    retry--;
	    if( retry < 0 ) {
		safeLoc = location;
		stop = true;

		if( config.verbose )
		    console.log("findSafeLocation: cannot find a safe location, return original loc");
	    } else {
		var x = rand.nextInt( radius ) - radius/2;
		var z = rand.nextInt( radius ) - radius/2;
		safeLoc.add(x, 0.0, z);
	    }
	}
    }

    return [safeLoc, found];
}

var safeLoc = [
    [-135, 4, -273],
    [-135, 4, -262],
    [-122, 4, -265],
    [-122, 4, -279],
    [-135, 4, -289],
    [-154, 4, -291],
    [-154, 4, -269],
    [-154, 4, -250],
    [-156, 4, -238],
    [-187, 4, -249],
    [-188, 4, -257],
    [-193, 4, -270]
];

exports.getSafeLoc = function() {
    var loc;
    var world = server.worlds.get(0);
    //var rand = new Random(java.time.Instant.epochSecond);
    var rand = new Random();
    
    var randLoc = rand.nextInt( safeLoc.length-1 );
    var sloc = safeLoc[ randLoc ];
    loc = new org.bukkit.Location( world, sloc[0], sloc[1], sloc[2] );

    if( config.verbose )
	console.log("fall back to old getSafeLoc: " + loc + ", random idx =" + randLoc);

    return loc;
}
