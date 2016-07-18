/// Definitions and stuff.
/// ----------------------

// types of gates.
var GATE_NONE   = 1
var GATE_SWITCH = 2
var GATE_AND    = 3
var GATE_OR     = 4
var GATE_XOR    = 5
var GATE_NAND   = 6
var GATE_NOR    = 7
var GATE_XNOR   = 8

// how fast should our game run?
var GAME_FPS   = 60;

// important div's.
var divGameCanvas  = document.getElementById ('game_canvas');
var divGameContext = divGameCanvas.getContext ('2d');

// screen resolution.
var screenWidth  = null;
var screenHeight = null;
var transX       = 0;
var transY       = 0;

// data for the current level.
var currentCircuit = null;
var currentTimer   = null;

// internal stuff.
var gameInitialized = false;
var gameOver        = false;
var frameUpdated    = true;
