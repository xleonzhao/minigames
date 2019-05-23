/*************************************************************

 *************************************************************/
var npcID_0    = 100;
var max_npcs   = 100;
var namePrefix = "NPC";

var _NPC = (function() {

    // protected variable, it will be initialized only once.
    var npcID = npcID_0;

    return function() {
	if( npcID > npcID_0 + max_npcs ) {
	    console.log("Too many NPCs, max allowed number of NPCs is " + max_npcs);
	    return;
	}
	
	this.id   = npcID;
	this.relative_id = npcID - npcID_0;
	this.name = namePrefix + this.id;
    
	npcID++;

	this.decreaseID = function() {
	    if (npcID > npcID_0)
		npcID--;
	}

	this.resetID = function() {
	    npcID = npcID_0;
	    if( config.verbose )
		console.log("npcID reset");
	}
    };

})();

/* this interface serves external calls, because npcID is a private
   member of _NPC class, cannot be accessed publicly
*/
_NPC.prototype.destroy = function() {
    this.decreaseID();
};

_NPC.prototype.reset = function() {
    this.resetID();
}

_NPC.id_to_name = function( id ) {
    var newID = npcID_0 + id;
    return namePrefix + newID;
}

exports.NPC = _NPC;
