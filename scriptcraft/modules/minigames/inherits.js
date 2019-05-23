function extend(target, source) {
    Object.getOwnPropertyNames(source).forEach(function(propName) {
	Object.defineProperty(target, propName,
			      Object.getOwnPropertyDescriptor(source, propName));
    });
    return target;
};

function protoChain() {
    if (arguments.length === 0) return null;
    var prev = arguments[0];
    for(var i=1; i < arguments.length; i++) {
	// Create duplicate of arguments[i] with prototype prev
	prev = Object.create(prev);
	extend(prev, arguments[i]);
    }
    return prev;
};

function inherits(SubC, SuperC) {
    var subProto = Object.create(SuperC.prototype);
    // At the very least, we keep the "constructor" property
    // At most, we preserve additions that have already been made
    extend(subProto, SubC.prototype);
    SubC.prototype = subProto;
    SubC._super = SuperC.prototype;
};

exports.inherits = inherits;

