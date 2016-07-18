/// utility functions.
/// ------------------

function randomInt (low, max) {
   return low + Math.floor (Math.random () * (max - low));
}

function minInit (a, b) {
        if (a === undefined || a === null) return b;
   else if (b === undefined || b === null) return a;
   else                                    return Math.min (a, b);
}

function maxInit (a, b) {
        if (a === undefined || a === null) return b;
   else if (b === undefined || b === null) return a;
   else                                    return Math.max (a, b);
}
