const NORTH = 0;
const NE = 1;
const EAST = 2;
const SE = 3;
const SOUTH = 4;
const SW = 5;
const WEST = 6;
const NW = 7;

const P = 0;
const N = 1;
const B = 2;
const R = 3;
const Q = 4;
const K = 5;
const EMPTY = 6;

const MAX_PLY = 64;
const MOVE_STACK = 2000;
const GAME_STACK = 2000;
const HASH_SCORE = 100000000;
const CAPTURE_SCORE = 10000000;

const A1 = 0, B1 = 1, C1 = 2, D1 = 3, E1 = 4, F1 = 5, G1 = 6, H1 = 7;
const A2 = 8;
const A8 = 56, B8 = 57, C8 = 58, D8 = 59, E8 = 60, F8 = 61, G8 = 62, H8 = 63;

var bug = "ok";//
var bug1 = "ok";//
var bug2 = "ok";//
var bug3 = "ok";//
var bug4 = "ok";//
var bug5 = "ok";//

var fen_name;
var fixed_depth;
var max_time;
var start_time = 0;
var stop_time;
var max_depth = 1;
var deep;
var turn = 0;
var currentkey = 0;
var currentlock = 0;
var currentpawnkey = 0;
var currentpawnlock = 0;
var root_start, root_dest, root_score;
var mc;

function Create2DArray(r, c1) {
    var x = [];
    x.length = r;
    for (var i = 0; i < r; i++) {
        x[i] = [];
        x[i].length = c1;
        for (var j = 0; j < c1; j++) {
            x[i][j] = 0;
        }
    }
    return x;
}

function InitBoard() {
    var i;
    for (i = 0; i < 64; ++i) {
        color[i] = INIT_COLOR[i];
        b[i] = INIT_PIECE[i];
    }
    side = 0;
    xside = 1;
    fifty = 0;
    ply = 0;
    hply = 0;
    first_move[0] = 0;
    Kingloc[0] = E1;
    Kingloc[1] = E8;
    SetCastle(1);
}

const FLIP_BOARD = [
    56, 57, 58, 59, 60, 61, 62, 63,
    48, 49, 50, 51, 52, 53, 54, 55,
    40, 41, 42, 43, 44, 45, 46, 47,
    32, 33, 34, 35, 36, 37, 38, 39,
    24, 25, 26, 27, 28, 29, 30, 31,
    16, 17, 18, 19, 20, 21, 22, 23,
    8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7
];

function Algebraic(x) {
    const file = 'abcdefgh'[COL[x]];
    const rank = ROW[x] + 1;
    return file + rank;
}

function LongAlgebraic(p, x, y, capture) {
    var piece = piece_char[p];
    if (p == P) piece = "";
    const file = 'abcdefgh'[COL[x]];
    const rank = ROW[x] + 1;
    var hyphen = "-";
    if (capture != EMPTY) hyphen = "x";
    return piece + file + rank + hyphen + Algebraic(y);
}

onmessage = function (event) {
    var line = event.data;
    var a = "", a2 = "";
    a = FirstPart(line);
    a2 = SecondPart(line);
    var move, from, dest;
    var a1;

    switch (a) {
        case "set":
            SetUp();
            postMessage("add=engine loaded");
            break;
        case "new":
            InitBoard();
            CopyBoard();
            postMessage("add=");
            break;
        case "cas1":
            SetCastle(1);
            break;
        case "depth":
            max_depth = Number(a2);
            break;
        case "takeback":
            if (hply > 0) {
                TakeBack();
                CopyBoard();
                postMessage("add=");
            }
            break;
        case "think":
            CompMove(a2);
            GetResult();
            break;
        case "diag":
            LoadDiagram(a2);
            CopyBoard();
            postMessage("add=");
            break;
        case "board"://
            CopyBoard();
            break;
        case "play":
            move = a2;
            from = FirstPart(a2);
            dest = SecondPart(a2);
            if (IsLegal2(from, dest) == -1) {
                postMessage("illegal=" + from + " " + dest);
                return;
            }
            MakeMove(from, dest);
            CopyBoard();
            break;
    }
}

function CompMove(a2) {
    const start = Date.now();
    Think();
    const millis = Date.now() - start;
    var nps = 0;
    if (millis > 0) nps = nodes * 1000 / millis;
    side = Number(a2);
    xside = side ^ 1;
    var piece = b[root_start];
    var capture = b[root_dest];
    MakeMove(root_start, root_dest);
    CopyBoard();
    var a1 = LongAlgebraic(piece, root_start, root_dest, capture) + " depth " + max_depth + "<br> score " + root_score + "<br>";
    a1 += " Time " + millis + " Nodes " + nodes + " Nodes per second " + Math.round(nps);
    postMessage("info=" + a1);
}

function FirstPart(a) {
    var a2 = "";
    if (a == undefined) return a2;
    for (var x = 0; x < a.length; x++) {
        if (a.charAt(x) == "=") break;
        a2 += a.charAt(x);
    }
    return a2;
}

function SecondPart(a) {
    var a2 = "";
    if (a == undefined) return a2;
    var flag = 0;
    for (var x = 0; x < a.length; x++) {
        if (flag == 1) a2 += a.charAt(x);
        if (a.charAt(x) == "=") flag = 1;
    }
    return a2;
}

function CopyBoard() {
    var a = "";
    for (var x = 0; x < 64; x++) {
        a += b[x];
    }
    for (var x = 0; x < 64; x++) {
        a += color[x];
    }
    postMessage("cb=" + a);
    postMessage("side=" + side);
}

function PostBoard() {
    var s = "";
    var k = "";
    for (var x = 0; x < 64; x++) {
        if (color[x] == 0) k = "w";
        if (color[x] == 1) k = "b";
        switch (b[x]) {
            case "p":
                s += (k + "p" + Algebraic(x) + " ");
                break;
            case "n":
                s += (k + "n" + Algebraic(x) + " ");
                break;
            case "b":
                s += (k + "b" + Algebraic(x) + " ");
                break;
            case "r":
                s += (k + "r" + Algebraic(x) + " ");
                break;
            case "q":
                s += (k + "q" + Algebraic(x) + " ");
                break;
            case "k":
                s += (k + "k" + Algebraic(x) + " ");
                break;
            default:
                break;
        }
    }
    postMessage("pb=" + s);
}

function SetUp() {
    SetTables();
    SetMoves();
    SetBits();
    InitBoard();
}

function Move() {
    var from = 0;
    var dest = 0;
    var promote = 0;
    var score = 0;
}

function Game() {
    var from = 0;
    var dest = 0;
    var promote = 0;
    var capture = 0;
    var fifty = 0;
    var castle_q0 = 0;
    var castle_q1 = 0;
    var castle_k0 = 0;
    var castle_k1 = 0;
    var start_piece = 0;
}

var move_list = [];
var game_list = [];

var side = 0, xside = 1;
var fifty = 0;
var ply = 0, hply = 0;

var nodes = 0;

var Kingloc = []; Kingloc.length = 2;
var Table_score = []; Table_score.length = 2;
var Pawn_mat = []; Pawn_mat.length = 2;
var Piece_mat = []; Piece_mat.length = 2;

var b = []; b.length = 64;
var color = []; color.length = 64;
var first_move = []; first_move.length = 64;

var mask = []; mask.length = 64;
var not_mask = []; not_mask.length = 64;

var Hist = new Create2DArray(64, 64);
var King_endgame = new Create2DArray(2, 64);
var square_score0 = new Create2DArray(7, 64);
var square_score1 = new Create2DArray(7, 64);
var Passed = new Create2DArray(2, 64);
var Kmoves = new Create2DArray(64, 9);
var Knightmoves = new Create2DArray(64, 9);
var Kingmoves = new Create2DArray(64, 9);
var mask_passed = new Create2DArray(2, 64);
var mask_isolated = new Create2DArray(2, 64);
var bit_pieces = new Create2DArray(2, 7);

var piece_char = ["P", 'N', 'B', 'R', 'Q', 'K'];

var piece_value = [100, 300, 300, 500, 900, 10000];

const INIT_COLOR = [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1
];

const INIT_PIECE = [
    3, 1, 2, 4, 5, 2, 1, 3,
    0, 0, 0, 0, 0, 0, 0, 0,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    0, 0, 0, 0, 0, 0, 0, 0,
    3, 1, 2, 4, 5, 2, 1, 3
];

const COL = [
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 1, 2, 3, 4, 5, 6, 7,
    0, 1, 2, 3, 4, 5, 6, 7
];

const ROW = [
    0, 0, 0, 0, 0, 0, 0, 0,
    1, 1, 1, 1, 1, 1, 1, 1,
    2, 2, 2, 2, 2, 2, 2, 2,
    3, 3, 3, 3, 3, 3, 3, 3,
    4, 4, 4, 4, 4, 4, 4, 4,
    5, 5, 5, 5, 5, 5, 5, 5,
    6, 6, 6, 6, 6, 6, 6, 6,
    7, 7, 7, 7, 7, 7, 7, 7
];

const NW_DIAG = [
    14, 13, 12, 11, 10, 9, 8, 7,
    13, 12, 11, 10, 9, 8, 7, 6,
    12, 11, 10, 9, 8, 7, 6, 5,
    11, 10, 9, 8, 7, 6, 5, 4,
    10, 9, 8, 7, 6, 5, 4, 3,
    9, 8, 7, 6, 5, 4, 3, 2,
    8, 7, 6, 5, 4, 3, 2, 1,
    7, 6, 5, 4, 3, 2, 1, 0
];

const NE_DIAG = [
    7, 8, 9, 10, 11, 12, 13, 14,
    6, 7, 8, 9, 10, 11, 12, 13,
    5, 6, 7, 8, 9, 10, 11, 12,
    4, 5, 6, 7, 8, 9, 10, 11,
    3, 4, 5, 6, 7, 8, 9, 10,
    2, 3, 4, 5, 6, 7, 8, 9,
    1, 2, 3, 4, 5, 6, 7, 8,
    0, 1, 2, 3, 4, 5, 6, 7
];

var b = [
    3, 1, 2, 4, 5, 2, 1, 3,
    0, 0, 0, 0, 0, 0, 0, 0,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    0, 0, 0, 0, 0, 0, 0, 0,
    3, 1, 2, 4, 5, 2, 1, 3
];

var color = [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    6, 6, 6, 6, 6, 6, 6, 6,
    1, 1, 1, 1, 1, 1, 1, 1,
    1, 1, 1, 1, 1, 1, 1, 1
];

const PAWN_SCORE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 2, 4, -12, -12, 4, 2, 0,
    0, 2, 4, 4, 4, 4, 2, 0,
    0, 2, 4, 8, 8, 4, 2, 0,
    0, 2, 4, 8, 8, 4, 2, 0,
    4, 8, 10, 16, 16, 10, 8, 4,
    100, 100, 100, 100, 100, 100, 100, 100,
    0, 0, 0, 0, 0, 0, 0, 0
];

const KNIGHT_SCORE = [
    -30, -20, -10, -8, -8, -10, -20, -30,
    -16, -6, -2, 0, 0, -2, -6, -16,
    -8, -2, 4, 6, 6, 4, -2, -8,
    -5, 0, 6, 8, 8, 6, 0, -5,
    -5, 0, 6, 8, 8, 6, 0, -5,
    -10, -2, 4, 6, 6, 4, -2, -10,
    -20, -10, -2, 0, 0, -2, -10, -20,
    -150, -20, -10, -5, -5, -10, -20, -150
];

const BISHOP_SCORE = [
    -10, -10, -12, -10, -10, -12, -10, -10,
    0, 4, 4, 4, 4, 4, 4, 0,
    2, 4, 6, 6, 6, 6, 4, 2,
    2, 4, 6, 8, 8, 6, 4, 2,
    2, 4, 6, 8, 8, 6, 4, 2,
    2, 4, 6, 6, 6, 6, 4, 2,
    -10, 4, 4, 4, 4, 4, 4, -10,
    -10, -10, -10, -10, -10, -10, -10, -10
];

const ROOK_SCORE = [
    4, 4, 4, 6, 6, 4, 4, 4,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    20, 20, 20, 20, 20, 20, 20, 20,
    10, 10, 10, 10, 10, 10, 10, 10
];

const QUEEN_SCORE = [
    -10, -10, -6, -4, -4, -6, -10, -10,
    -10, 2, 2, 2, 2, 2, 2, -10,
    2, 2, 2, 3, 3, 2, 2, 2,
    2, 2, 3, 4, 4, 3, 2, 2,
    2, 2, 3, 4, 4, 3, 2, 2,
    2, 2, 2, 3, 3, 2, 2, 2,
    -10, 2, 2, 2, 2, 2, 2, -10,
    -10, -10, 2, 2, 2, 2, -10, -10
];

const KING_SCORE = [
    20, 20, 20, -40, 10, -60, 20, 20,
    15, 20, -25, -30, -30, -45, 20, 15,
    -48, -48, -48, -48, -48, -48, -48, -48,
    -48, -48, -48, -48, -48, -48, -48, -48,
    -48, -48, -48, -48, -48, -48, -48, -48,
    -48, -48, -48, -48, -48, -48, -48, -48,
    -48, -48, -48, -48, -48, -48, -48, -48,
    -50, -50, -50, -50, -50, -50, -50, -50
];

const KING_ENDGAME_SCORE = [
    0, 8, 16, 18, 18, 16, 8, 0,
    8, 16, 24, 32, 32, 24, 16, 8,
    16, 24, 32, 40, 40, 32, 24, 16,
    25, 32, 40, 48, 48, 40, 32, 25,
    25, 32, 40, 48, 48, 40, 32, 25,
    16, 24, 32, 40, 40, 32, 24, 16,
    8, 16, 24, 32, 32, 24, 16, 8,
    0, 8, 16, 18, 18, 16, 8, 0
];

const PASSED_SCORE = [
    0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0,
    60, 60, 60, 60, 60, 60, 60, 60,
    30, 30, 30, 30, 30, 30, 30, 30,
    15, 15, 15, 15, 15, 15, 15, 15,
    8, 8, 8, 8, 8, 8, 8, 8,
    8, 8, 8, 8, 8, 8, 8, 8,
    0, 0, 0, 0, 0, 0, 0, 0
];

function Create2DArray(r, c1) {
    var x = [];
    x.length = r;
    for (var i = 0; i < r; i++) {
        x[i] = [];
        x[i].length = c1;
        for (var j = 0; j < c1; j++) {
            x[i][j] = 0;
        }
    }
    return x;
}

function SetTables() {
    for (var x1 = 0; x1 < 64; x1++) {
        for (var y1 = 0; y1 < 64; y1++) {
            Hist[x1][y1] = 0;
        }
    }
    var f;
    for (var x = 0; x < MOVE_STACK; x++) {
        move_list.push(new Move());
        game_list.push(new Game());
    }
    for (x = 0; x < 64; x++) {
        first_move[x] = 0;
    }
    for (x = 0; x < 64; x++) {
        square_score0[P][x] = PAWN_SCORE[x] + 100;
        square_score0[N][x] = KNIGHT_SCORE[x] + 300;
        square_score0[B][x] = BISHOP_SCORE[x] + 300;
        square_score0[R][x] = ROOK_SCORE[x] + 500;
        square_score0[Q][x] = QUEEN_SCORE[x] + 900;
        square_score0[K][x] = KING_SCORE[x];
        square_score0[6][x] = 0;
    }
    for (x = 0; x < 64; x++) {
        f = FLIP_BOARD[x];
        square_score1[0][x] = PAWN_SCORE[f] + 100;
        square_score1[1][x] = KNIGHT_SCORE[f] + 300;
        square_score1[2][x] = BISHOP_SCORE[f] + 300;
        square_score1[3][x] = ROOK_SCORE[f] + 500;
        square_score1[4][x] = QUEEN_SCORE[f] + 900;
        square_score1[5][x] = KING_SCORE[f];
        square_score1[6][x] = 0;
        King_endgame[0][x] = KING_ENDGAME_SCORE[x] - square_score0[5][x];
        King_endgame[1][x] = KING_ENDGAME_SCORE[x] - square_score1[5][x];
        Passed[0][x] = PASSED_SCORE[f];
        Passed[1][x] = PASSED_SCORE[x];
    }
    //BigInt(currentkey);
    //BigInt(currentlock);
    //BigInt(currentpawnkey);
    //BigInt(currentpawnlock);
    RandomizeHash();
    SetPawnHash();
}

function SetCastle(flag) {
    game_list[0].castle_q0 = flag;
    game_list[0].castle_q1 = flag;
    game_list[0].castle_k0 = flag;
    game_list[0].castle_k1 = flag;
}

function NewPosition() {
    var i;
    var s;
    Piece_mat[0] = Pawn_mat[0] = Table_score[0] = 0;
    Piece_mat[1] = Pawn_mat[1] = Table_score[1] = 0;
    for (i = 0; i < 64; i++) {
        if (b[i] != EMPTY) {
            s = color[i];
            AddPiece(s, b[i], i);
        }
    }
    currentkey = GetKey();
    currentlock = GetLock();
}

function SetMoves() {
    var k = 0;
    var x, y, z;

    for (x = 0; x < 64; x++) {
        k = 0;
        if (ROW[x] < 6 && COL[x] < 7)
            Knightmoves[x][k++] = x + 17;
        if (ROW[x] < 7 && COL[x] < 6)
            Knightmoves[x][k++] = x + 10;
        if (ROW[x] < 6 && COL[x] > 0)
            Knightmoves[x][k++] = x + 15;
        if (ROW[x] < 7 && COL[x] > 1)
            Knightmoves[x][k++] = x + 6;
        if (ROW[x] > 1 && COL[x] < 7)
            Knightmoves[x][k++] = x - 15;
        if (ROW[x] > 0 && COL[x] < 6)
            Knightmoves[x][k++] = x - 6;
        if (ROW[x] > 1 && COL[x] > 0)
            Knightmoves[x][k++] = x - 17;
        if (ROW[x] > 0 && COL[x] > 1)
            Knightmoves[x][k++] = x - 10;
        Knightmoves[x][k] = -1;
    }

    for (x = 0; x < 64; x++) {
        k = 0;

        for (z = 0; z < 8; z++)
            Kmoves[x][z] = -1;

        if (COL[x] > 0) Kmoves[x][WEST] = x - 1;
        if (COL[x] < 7) Kmoves[x][EAST] = x + 1;
        if (ROW[x] > 0) Kmoves[x][SOUTH] = x - 8;
        if (ROW[x] < 7) Kmoves[x][NORTH] = x + 8;
        if (COL[x] < 7 && ROW[x] < 7) Kmoves[x][NE] = x + 9;
        if (COL[x] > 0 && ROW[x] < 7) Kmoves[x][NW] = x + 7;
        if (COL[x] > 0 && ROW[x] > 0) Kmoves[x][SW] = x - 9;
        if (COL[x] < 7 && ROW[x] > 0) Kmoves[x][SE] = x - 7;

        y = 0;
        if (COL[x] > 0)
            Kingmoves[x][y++] = x - 1;
        if (COL[x] < 7)
            Kingmoves[x][y++] = x + 1;
        if (ROW[x] > 0)
            Kingmoves[x][y++] = x - 8;
        if (ROW[x] < 7)
            Kingmoves[x][y++] = x + 8;
        if (COL[x] < 7 && ROW[x] < 7)
            Kingmoves[x][y++] = x + 9;
        if (COL[x] > 0 && ROW[x] < 7)
            Kingmoves[x][y++] = x + 7;
        if (COL[x] > 0 && ROW[x] > 0)
            Kingmoves[x][y++] = x - 9;
        if (COL[x] < 7 && ROW[x] > 0)
            Kingmoves[x][y++] = x - 7;
        Kingmoves[x][y] = -1;
    }
}

function LineCheck(s, sq, d, p) {
    sq = Kmoves[sq][d];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (b[sq] == p && color[sq] == s)
                return sq;
            break;
        }
        sq = Kmoves[sq][d];
    }
    return -1;
}

function LineCheck2(s, sq, d, p1, p2) {
    sq = Kmoves[sq][d];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if ((b[sq] == p1 || b[sq] == p2) && color[sq] == s)
                return true;
            break;
        }
        sq = Kmoves[sq][d];
    }
    return false;
}

function Attack(s, x) {
    x = Number(x);
    if (s == 0) {
        if (ROW[x] > 1) {
            if (COL[x] < 7 && color[x - 7] == s && b[x - 7] == P)
                return true;
            if (COL[x] > 0 && color[x - 9] == s && b[x - 9] == P)
                return true;
        }
    } else if (ROW[x] < 6) {
        if (COL[x] > 0 && color[x + 7] == s && b[x + 7] == P)
            return true;
        if (COL[x] < 7 && color[x + 9] == s && b[x + 9] == P)
            return true;
    }

    var k = 0;
    var sq = Knightmoves[x][0];

    while (sq > -1) {
        if (color[sq] == s && b[sq] == N)
            return true;
        k++;
        sq = Knightmoves[x][k];
    }
    if (LineCheck2(s, x, NE, B, Q)) return true;
    if (LineCheck2(s, x, NW, B, Q)) return true;
    if (LineCheck2(s, x, SW, B, Q)) return true;
    if (LineCheck2(s, x, SE, B, Q)) return true;

    if (LineCheck2(s, x, NORTH, R, Q)) return true;
    if (LineCheck2(s, x, SOUTH, R, Q)) return true;
    if (LineCheck2(s, x, EAST, R, Q)) return true;
    if (LineCheck2(s, x, WEST, R, Q)) return true;

    if (Kingloc[s] > -1 && Math.abs(COL[x] - COL[Kingloc[s]]) < 2 && Math.abs(ROW[x] - ROW[Kingloc[s]]) < 2)
        return true;

    return false;
}

function LowestAttacker(s, x) {
    x = Number(x);
    if (s == 0) {
        if (ROW[x] > 1) {
            if (COL[x] < 7 && color[x - 7] == s && b[x - 7] == P)
                return x - 7;
            if (COL[x] > 0 && color[x - 9] == s && b[x - 9] == P)
                return x - 9;
        }
    } else if (ROW[x] < 6) {
        if (COL[x] > 0 && color[x + 7] == s && b[x + 7] == P)
            return x + 7;
        if (COL[x] < 7 && color[x + 9] == s && b[x + 9] == P)
            return x + 9;
    }

    var k = 0;
    var sq = Knightmoves[x][k];

    while (sq > -1) {
        if (color[sq] == s && b[sq] == N)
            return sq;
        k++;
        sq = Knightmoves[x][k];
    }
    sq = LineCheck(s, x, NE, B); if (sq > -1) return sq;
    sq = LineCheck(s, x, NW, B); if (sq > -1) return sq;
    sq = LineCheck(s, x, SW, B); if (sq > -1) return sq;
    sq = LineCheck(s, x, SE, B); if (sq > -1) return sq;

    sq = LineCheck(s, x, NORTH, R); if (sq > -1) return sq;
    sq = LineCheck(s, x, SOUTH, R); if (sq > -1) return sq;
    sq = LineCheck(s, x, EAST, R); if (sq > -1) return sq;
    sq = LineCheck(s, x, WEST, R); if (sq > -1) return sq;

    sq = LineCheck(s, x, NORTH, Q); if (sq > -1) return sq;
    sq = LineCheck(s, x, SOUTH, Q); if (sq > -1) return sq;
    sq = LineCheck(s, x, EAST, Q); if (sq > -1) return sq;
    sq = LineCheck(s, x, WEST, Q); if (sq > -1) return sq;

    sq = LineCheck(s, x, NE, Q); if (sq > -1) return sq;
    sq = LineCheck(s, x, NW, Q); if (sq > -1) return sq;
    sq = LineCheck(s, x, SW, Q); if (sq > -1) return sq;
    sq = LineCheck(s, x, SE, Q); if (sq > -1) return sq;

    if (Kingloc[s] > -1 && Math.abs(COL[x] - COL[Kingloc[s]]) < 2 && Math.abs(ROW[x] - ROW[Kingloc[s]]) < 2)
        return Kingloc[s];

    return -1;
}

// hash tables etc
var whitehash = new Create2DArray(6, 64);
var blackhash = new Create2DArray(6, 64);
var whitelock = new Create2DArray(6, 64);
var blacklock = new Create2DArray(6, 64);
//
var whitepawnhash = [];
whitepawnhash.length = 64;
var blackpawnhash = [];
blackpawnhash.length = 64;
var whitepawnlock = [];
whitepawnlock.length = 64;
var blackpawnlock = [];
blackpawnlock.length = 64;

const MAXPAWNHASH = 65536;
const PAWNHASHSIZE = 32768;

var hashpos0 = [];
var hashpos1 = [];
var hashpawns = [];

function hashp() {
    var hashlock = 0;
    var from = 0;
    var dest = 0;
    var num = 0;
}

function hashpawn() {
    var hashlock = 0;
    var score = 0;
}

const HASHSIZE = 500000;
var clashes = 0, collisions = 0;
var hash_start, hash_dest;

function SetPawnHash() {
    for (var x = 0; x < MAXPAWNHASH; x++) {
        hashpawns.push(new hashpawn());
    }
    for (x = 0; x < HASHSIZE + 100000; x++) {
        hashpos0.push(new hashp());
        hashpos1.push(new hashp());
    }
}

function RandomizeHash() {
    var p, x;
    for (p = 0; p < 6; p++) {
        for (x = 0; x < 64; x++) {
            whitehash[p][x] = Random(HASHSIZE);
            blackhash[p][x] = Random(HASHSIZE);
            whitelock[p][x] = Random(HASHSIZE);
            blacklock[p][x] = Random(HASHSIZE);
        }
    }
    for (x = 0; x < 64; x++) {
        whitepawnhash[x] = Random(PAWNHASHSIZE);
        blackpawnhash[x] = Random(PAWNHASHSIZE);
        whitepawnlock[x] = Random(PAWNHASHSIZE);
        blackpawnlock[x] = Random(PAWNHASHSIZE);
    }
}

function Random(x) {
    return Math.floor(Math.random() * x);
}

function AddHash(s, m) {
    if (currentkey >= HASHSIZE + 100000) {
        postMessage("alert=cur " + currentkey);
        return;
    }
    if (s == 0) {
        hashpos0[currentkey].hashlock = currentlock;
        hashpos0[currentkey].from = m.from;
        hashpos0[currentkey].dest = m.dest;
    } else {
        hashpos1[currentkey].hashlock = currentlock;
        hashpos1[currentkey].from = m.from;
        hashpos1[currentkey].dest = m.dest;
    }
}

function AddKey(s, p, x) {
    //PrintBoard();//??
    try {
        if (s == 0) {
            currentkey ^= whitehash[p][x];
            currentlock ^= whitelock[p][x];
        } else {
            currentkey ^= blackhash[p][x];
            currentlock ^= blacklock[p][x];
        }
    }
    catch (err) {
        //DisplayPV(ply);
        var a1 = "alert= " + err + " addkey s " + s + " p " + p + " x " + x + " bug " + bug + " bug1 " + bug1 + " bug2 " + bug2;
        postMessage(a1 + " ply " + ply + " hply " + hply + "bug3 " + bug3);
    }
}

function GetLock() {
    var lock = 0;
    for (var x = 0; x < 64; x++) {
        if (b[x] != EMPTY) {
            if (color[x] == 0)
                lock ^= whitelock[b[x]][x];
            else
                lock ^= blacklock[b[x]][x];
        }
    }
    return lock;
}

function GetKey() {
    var key = 0;
    for (var x = 0; x < 64; x++) {
        if (b[x] != EMPTY) {
            if (color[x] == 0)
                key ^= whitehash[b[x]][x];
            else
                key ^= blackhash[b[x]][x];
        }
    }
    return key;
}

function LookUp(s) {
    if (currentkey >= HASHSIZE + 100000) {
        postMessage("alert=cur2 " + currentkey)
        return;
    }
    if (s == 0) {
        if (hashpos0[currentkey].hashlock != currentlock)
            return false;
        hash_start = hashpos0[currentkey].from;
        hash_dest = hashpos0[currentkey].dest;
    } else {
        if (hashpos1[currentkey].hashlock != currentlock)
            return false;
        hash_start = hashpos1[currentkey].from;
        hash_dest = hashpos1[currentkey].dest;
    }
    return true;
}

function GetPawnKey() {
    var key = 0;
    for (var x = 0; x < 64; x++) {
        if (b[x] == P) {
            if (color[x] == 0)
                key ^= whitepawnhash[x];
            else
                key ^= blackpawnhash[x];
        }
    }
    return key;
}

function GetPawnLock() {
    var key = 0;
    for (var x = 0; x < 64; x++) {
        if (b[x] == P) {
            if (color[x] == 0)
                key ^= whitepawnlock[x];
            else
                key ^= blackpawnlock[x];
        }
    }
    return key;
}

function AddPawnKey(s, x) {
    if (s == 0) {
        currentpawnkey ^= whitepawnhash[x];
        currentpawnlock ^= whitepawnlock[x];
    } else {
        currentpawnkey ^= blackpawnhash[x];
        currentpawnlock ^= blackpawnlock[x];
    }
}

function AddHashPawns(score) {
    hashpawns[currentpawnkey].hashlock = currentpawnlock;
    hashpawns[currentpawnkey].score = score;
}

function GetHashPawns() {
    if (hashpawns[currentpawnkey].hashlock == currentpawnlock)
        return hashpawns[currentpawnkey].score;
    return -1;
}

function SetBits() {
    var x, y;
    for (x = 0; x < 2; x++) {
        for (y = 0; y < 7; y++)
            bit_pieces[x][y] = 0;
    }
    for (x = 0; x < 64; x++)
        mask[x] = (1 << x);
    for (x = 0; x < 64; x++)
        not_mask[x] = ~mask[x];
    for (x = 0; x < 64; x++) {
        mask_isolated[x] = 0;
        for (y = 0; y < 64; y++) {
            if (Math.abs(COL[x] - COL[y]) == 1)
                mask_isolated[x] |= (1 << y);
        }
    }
    for (x = 0; x < 64; x++) {
        mask_passed[0][x] = 0;
        mask_passed[1][x] = 0;

        for (y = 0; y < 64; y++) {
            if (Math.abs(COL[x] - COL[y]) < 2) {
                if (ROW[x] < ROW[y] && ROW[y] < 7)
                    mask_passed[0][x] |= (1 << y);
                if (ROW[x] > ROW[y] && ROW[y] > 0)
                    mask_passed[1][x] |= (1 << y);
            }
        }
    }
}

function GetBit(bb, square) {
    return (bb & (1 << square));
}

function PrintBitBoard(bb) {
    var s = "<font face=courier>";
    s += "<br>";
    var x;
    for (x = 24; x < 32; x++)
        s += PrintCell(x, bb);
    for (x = 16; x < 24; x++)
        s += PrintCell(x, bb);
    for (x = 8; x < 16; x++)
        s += PrintCell(x, bb);
    for (x = 0; x < 8; x++)
        s += PrintCell(x, bb);
    s += "</font>";
    postMessage("add=" + s);
}

function PrintCell(x, bb) {
    var a = "";
    if (GetBit(bb, x) == false)
        a += " -";
    else
        a += " X";
    if ((x + 1) % 8 == 0)
        a += "<br>";
    return a;
}

function PrintBoard() {
    var s = "<font face=courier>";
    s += "<br>";
    var x, sq;
    for (x = 0; x < 64; x++) {
        sq = b[x];
        if (color[x] == 0)
            sq = sq;
        if (b[x] == EMPTY)
            sq = "-";
        s += sq;
        if (x % 8 == 0)
            s += "<br>";
    }
    s += "</font>";
    postMessage("pos=" + s);
}

function Eval() {
    var score = Table_score[0] - Table_score[1];

    if (GetHashPawns() == -1) {
        score += EvalPawns();
    } else {
        score += GetHashPawns();
    }

    if (Kingloc[0] > -1) {
        if (bit_pieces[1][Q] == 0)
            score += King_endgame[0][Kingloc[0]];
        else {
            if (ROW[Kingloc[0]] < 2 && color[Kingloc[0] + 8] == 0)
                score += 10;
        }
    }

    if (Kingloc[1] > -1) {
        if (bit_pieces[0][Q] == 0)
            score -= King_endgame[1][Kingloc[1]];
        else {
            if (ROW[Kingloc[1]] > 5 && color[Kingloc[1] - 8] == 1)
                score -= 10;
        }
    }

    if (side == 0)
        return score;
    else
        return -score;
}

function EvalPawns() {
    var score = 0;
    var s, xs;
    for (var x = A2; x < A8; x++) {
        if (b[x] == P) {
            s = color[x];
            xs = s ^ 1;
            if (!(mask_passed[s][x] & bit_pieces[xs][P]))
                if (s == 0)
                    score += Passed[s][x];
                else
                    score -= Passed[s][x];
            if ((mask_isolated[x] & bit_pieces[s][P]) == 0)
                if (s == 0)
                    score -= 20;
                else
                    score += 20;
        }
    }
    AddHashPawns(score);
    return score;
}

var currentmax;

function Think() {
    root_start = 0;
    root_dest = 0;

    var x;

    ply = 0;
    nodes = 0;
    first_move[0] = 0;

    NewPosition();
    Gen();
    var count = 0;
    for (var i = first_move[ply]; i < first_move[ply + 1]; ++i) {
        if (!MakeMove(move_list[i].from, move_list[i].dest))
            continue;
        TakeBack();
        count++;
    }
    if (count == 1)
        max_depth = 1;

    for (var x1 = 0; x1 < 64; x1++) {
        for (var y1 = 0; y1 < 64; y1++)
            Hist[x1][y1] = 0;
    }
    for (var i = 1; i <= max_depth; ++i) {
        currentmax = i;

        currentkey = GetKey();
        currentlock = GetLock();

        deep = 0;

        x = Search(-10000, 10000, i);
        if (x > 9998)
            postMessage("add=Checkmate!<br>");
        else
            postMessage("add=" + i + " deepest " + deep + " " + x + " " + " " + nodes + "<br>");

        if (LookUp(side))
            DisplayPV(i);
        //postMessage("<br>");

        if (x > 9000 || x < -9000)
            break;
    }
}

function Search(alpha, beta, depth) {
    if (ply && reps2())
        return 0;

    if (bit_pieces[0][P] == 0 && bit_pieces[1][P] == 0 && Table_score[0] < 400 && Table_score[1] < 400)
        return 0;

    if (depth < 1)
        return CaptureSearch(alpha, beta);

    nodes++;

    if (ply > MAX_PLY - 2)
        return Eval();

    var bestmove = new Move();
    var bestscore = -10001;
    var check = 0;

    if (Attack(xside, Kingloc[side]))
        check = 1;

    Gen();

    if (LookUp(side))
        SetHashMove();

    var count = 0;
    var d;
    var init = alpha;
    var zero_flag = 0;
    var score = 0;

    for (var i = first_move[ply]; i < first_move[ply + 1]; ++i) {
        if (zero_flag == 0) {
            Sort(i);
            if (move_list[i].score == 0)
                zero_flag = 1;
        }
   
        if (!MakeMove(move_list[i].from, move_list[i].dest))
            continue;

        count++;

        if (Attack(xside, Kingloc[side])) 
            d = depth;
        else {
            if (move_list[i].score > 0 || ply < 2 || check == 1)
                d = depth - 1;
            else
                d = depth - 2;
        }

        score = -Search(-beta, -alpha, d);
        TakeBack();

        if (score > bestscore) {
            bestscore = score;
            bestmove = move_list[i];
            if (ply == 0) {
                root_start = move_list[i].from;
                root_dest = move_list[i].dest;
                root_score = score;
                //postMessage(" best " + root_start + " " + root_dest);
            }
        }
        if (score > alpha) {
            if (score >= beta) {
                if (b[move_list[i].dest] == EMPTY)
                    Hist[move_list[i].from][move_list[i].dest] += depth;
                //postMessage("hash " + move_list[i].from + move_list[i].dest);
                AddHash(side, move_list[i], ply);
                return beta;
            }

            alpha = score;
        }
    }

    if (count == 0) {
        if (Attack(xside, Kingloc[side]))
            return -10000 + ply;
        else
            return 0;
    }

    if (fifty >= 100)
        return 0;

    AddHash(side, bestmove, ply);
    return alpha;
}

function CaptureSearch(alpha, beta) {
    nodes++;

    var eval = Eval();

    if (eval > alpha) {
        if (eval >= beta)
            return beta;
        alpha = eval;
    } else if (eval + 900 < alpha)
        return alpha;

    var score = 0, bestmove = 0; best = 0;

    GenCaptures();

    for (var i = first_move[ply]; i < first_move[ply + 1]; ++i) {
        Sort(i);

        if (eval + piece_value[b[move_list[i].dest]] < alpha)
            continue;

        score = ReCaptureSearch(move_list[i].from, move_list[i].dest);

        if (score > best) {
            best = score;
            bestmove = i;
        }
    }

    if (best > 0)
        eval += best;

    if (eval > alpha) {
        if (eval >= beta) {
            if (best > 0)
                AddHash(side, move_list[bestmove], ply);
            return beta;
        }
        return eval;
    }

    return alpha;
}

function ReCaptureSearch(a, sq) {
    var a2;
    var a3 = 0;
    var t = 0;
    var score = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    score[0] = piece_value[b[sq]];
    score[1] = piece_value[b[a]];

    var total_score = 0;

    while (a3 < 10) {
        if (!MakeRecapture(a, sq))
            break;
        t++;
        nodes++;
        a3++;

        a2 = LowestAttacker(side, sq);

        if (a2 > -1) {
            score[a3 + 1] = piece_value[b[a2]];
            if (score[a3] > score[a3 - 1] + score[a3 + 1]) {
                a3--;
                break;
            }
        } else
            break;
        a = a2;
    }

    while (a3 > 1) {
        if (score[a3 - 1] >= score[a3 - 2])
            a3 -= 2;
        else
            break;
    }

    for (var x = 0; x < a3; x++) {
        if (x % 2 == 0)
            total_score += score[x];
        else
            total_score -= score[x];
    }

    if (ply > deep)
        deep = ply;

    while (t) {
        UnMakeRecapture();
        t--;
    }

    return total_score;
}

function reps() {
    var r = 0;
    for (var i = hply - 4; i >= hply - fifty; i -= 2) {
        if (game_list[i].hash == currentkey && game_list[i].lock == currentlock)
            r++;
    }
    return r;
}

function reps2() {
    for (var i = hply - 4; i >= hply - fifty; i -= 2) {
        if (game_list[i].hash == currentkey && game_list[i].lock == currentlock)
            return 1;
    }
    return 0;
}

function Sort(from) {
    var g;
    var bs = 0;
    var bi = from;
    for (var i = from; i < first_move[ply + 1]; ++i)
        if (move_list[i].score > bs) {
            bs = move_list[i].score;
            bi = i;
        }

    g = move_list[from];
    move_list[from] = move_list[bi];
    move_list[bi] = g;
}

function SetHashMove() {
    for (var x = first_move[ply]; x < first_move[ply + 1]; x++) {
        if (move_list[x].from == hash_start && move_list[x].dest == hash_dest) {
            move_list[x].score = HASH_SCORE;
            return;
        }
    }
}

function DisplayPV(i) {
    var text = "";
    for (var x = 0; x < i; x++) {
        if (LookUp(side) == false)
            break;
        text += LongAlgebraic(b[hash_start], hash_start, hash_dest, b[hash_dest]) + " ";
        MakeMove(hash_start, hash_dest);
    }
    while (ply)
        TakeBack();
    postMessage("add= PV " + i + " " + text);
}

function UpdatePiece(s, p, from, dest) {
    AddKey(s, p, from);
    AddKey(s, p, dest);
    b[dest] = p;
    color[dest] = s;
    b[from] = EMPTY;
    color[from] = EMPTY;
    if (s == 0)
        Table_score[0] -= square_score0[p][from];
    else
        Table_score[1] -= square_score1[p][from];

    if (s == 0)
        Table_score[0] += square_score0[p][dest];
    else
        Table_score[1] += square_score1[p][dest];

    bit_pieces[s][p] &= not_mask[from];
    bit_pieces[s][p] |= mask[dest];
    if (p == P) {
        AddPawnKey(s, from);
        AddPawnKey(s, dest);
    } else if (p == K)
        Kingloc[s] = dest;
}

function RemovePiece(s, p, sq) {
    AddKey(s, p, sq);
    b[sq] = EMPTY;
    color[sq] = EMPTY;
    if (s == 0)
        Table_score[0] -= square_score0[p][sq];
    else
        Table_score[1] -= square_score1[p][sq];

    bit_pieces[s][p] &= not_mask[sq];
    if (p == P)
        AddPawnKey(s, sq);
}

function AddPiece(s, p, sq) {
    AddKey(s, p, sq);
    b[sq] = p;
    color[sq] = s;
    if (s == 0)
        Table_score[0] += square_score0[p][sq];
    else
        Table_score[1] += square_score1[p][sq];

    bit_pieces[s][p] |= mask[sq];
    if (p == P)
        AddPawnKey(s, sq);
}

function MakeMove(from, dest) {
    // Handle castling moves
    if (Math.abs(COL[from] - COL[dest]) == 2 && b[from] == K) {
        if (Attack(xside, from) || Attack(xside, dest))
            return false;
        if (dest == G1) {
            if (Attack(1, F1))
                return false;
            UpdatePiece(0, K, E1, G1);
            UpdatePiece(0, R, H1, F1);
            game_list[hply].castle_k0 = 0;
            game_list[hply].castle_q0 = 0;
        }
        else if (dest == C1) {
            if (Attack(1, D1))
                return false;
            UpdatePiece(0, K, E1, C1);
            UpdatePiece(0, R, A1, D1);
            game_list[hply].castle_k0 = 0;
            game_list[hply].castle_q0 = 0;
        }
        else if (dest == G8) {
            if (Attack(0, F8))
                return false;
            UpdatePiece(1, K, E8, G8);
            UpdatePiece(1, R, H8, F8);
            game_list[hply].castle_k1 = 0;
            game_list[hply].castle_q1 = 0;
        }
        else if (dest == C8) {
            if (Attack(0, D8))
                return false;
            UpdatePiece(1, K, E8, C8);
            UpdatePiece(1, R, A8, D8);
            game_list[hply].castle_k1 = 0;
            game_list[hply].castle_q1 = 0;
        }
        game_list[hply].from = from;
        game_list[hply].dest = dest;
        game_list[hply].capture = EMPTY;
        game_list[hply].fifty = 0;
        game_list[hply].hash = currentkey;
        game_list[hply].lock = currentlock;
        game_list[hply].start_piece = K;

        ply++;
        hply++;

        game_list[hply].castle_q0 = game_list[hply - 1].castle_q0;
        game_list[hply].castle_q1 = game_list[hply - 1].castle_q1;
        game_list[hply].castle_k0 = game_list[hply - 1].castle_k0;
        game_list[hply].castle_k1 = game_list[hply - 1].castle_k1;

        side ^= 1;
        xside ^= 1;
        return true;
    }

    // Store game state for undoing later
    storeMoveData(from, dest);

    if (b[dest] != EMPTY || b[from] == P)
        fifty = 0;
    else
        fifty++;

    // Handle en passant
    if (b[from] == P && b[dest] == EMPTY && COL[from] != COL[dest]) {
        if (side == 0)
            RemovePiece(xside, P, dest - 8);
        else
            RemovePiece(xside, P, dest + 8);
    }
    else if (b[dest] != EMPTY) {
        // Capture move
        RemovePiece(xside, b[dest], dest);
    }

    if (dest == A1 || from == A1)
        game_list[hply].castle_q0 = 0;
    else if (dest == H1 || from == H1)
        game_list[hply].castle_k0 = 0;
    else if (from == E1) {
        game_list[hply].castle_q0 = 0;
        game_list[hply].castle_k0 = 0;
    }

    if (dest == A8 || from == A8)
        game_list[hply].castle_q1 = 0;
    else if (dest == H8 || from == H8)
        game_list[hply].castle_k1 = 0;
    else if (from == E8) {
        game_list[hply].castle_q1 = 0;
        game_list[hply].castle_k1 = 0;
    }

    // Handle pawn promotion
    if (b[from] == P && (ROW[dest] == 0 || ROW[dest] == 7)) {
        RemovePiece(side, P, from);
        AddPiece(side, Q, dest);
        game_list[hply].promote = Q;
    }
    else {
        game_list[hply].promote = 0;
        UpdatePiece(side, b[from], from, dest);
    }
    // Change turns
    side ^= 1;
    xside ^= 1;

    // Check if move puts own king in check
    if (Attack(side, Kingloc[xside])) {
        TakeBack();
        return false;
    }

    return true;
}

function storeMoveData(from, dest) {
    game_list[hply].from = from;
    game_list[hply].dest = dest;
    game_list[hply].capture = b[dest];
    game_list[hply].fifty = fifty;
    game_list[hply].hash = currentkey;
    game_list[hply].lock = currentlock;
    game_list[hply].start_piece = b[from];

    ply++;
    hply++;

    // Copy castle rights from previous move
    game_list[hply].castle_q0 = game_list[hply - 1].castle_q0;
    game_list[hply].castle_q1 = game_list[hply - 1].castle_q1;
    game_list[hply].castle_k0 = game_list[hply - 1].castle_k0;
    game_list[hply].castle_k1 = game_list[hply - 1].castle_k1;
}

function TakeBack() {
    // Switch back sides
    side ^= 1;
    xside ^= 1;

    // Decrease ply and history ply
    ply--;
    hply--;

    const from = game_list[hply].from;
    const dest = game_list[hply].dest;
    const capture = game_list[hply].capture;

    // Restore the fifty-move rule counter
    fifty = game_list[hply].fifty;
    //*
    // Handle en passant undo
    if (b[dest] === P && game_list[hply].capture == EMPTY && COL[from] !== COL[dest]) {
        UpdatePiece(side, P, dest, from);
        if (side === 0) {
            AddPiece(xside, P, dest - 8);  // Restore captured pawn for black
        } else {
            AddPiece(xside, P, dest + 8);  // Restore captured pawn for white
        }
        return;
    }

    if (game_list[hply].start_piece == P && (ROW[dest] == 0 || ROW[dest] == 7)) {
        AddPiece(side, P, from);
        RemovePiece(side, b[dest], dest);
    }
    else
        UpdatePiece(side, b[dest], dest, from);

    // Restore captured piece if any
    if (capture !== EMPTY) {
        AddPiece(xside, capture, dest);
    }

    // Handle castling undo
    if (Math.abs(COL[from] - COL[dest]) === 2 && b[from] === K) {
        undoCastling(dest);
    }
}

function undoCastling(dest) {
    if (dest === G1) {
        UpdatePiece(0, R, F1, H1);
        game_list[hply].castle_k0 = 1;
    } else if (dest === C1) {
        UpdatePiece(0, R, D1, A1);
        game_list[hply].castle_q0 = 1;
    } else if (dest === G8) {
        UpdatePiece(1, R, F8, H8);
        game_list[hply].castle_k1 = 1;
    } else if (dest === C8) {
        UpdatePiece(1, R, D8, A8);
        game_list[hply].castle_q1 = 1;
    }
}

function MakeRecapture(from, dest) {
    game_list[hply].from = from;
    game_list[hply].dest = dest;
    game_list[hply].capture = b[dest];
    ply++;
    hply++;
    b[dest] = b[from];
    color[dest] = color[from];
    b[from] = EMPTY;
    color[from] = EMPTY;

    if (b[dest] == K)
        Kingloc[side] = dest;
    side ^= 1;
    xside ^= 1;

    if (Attack(side, Kingloc[xside])) {
        UnMakeRecapture();
        return false;
    }
    return true;
}

function UnMakeRecapture() {
    side ^= 1;
    xside ^= 1;
    --ply;
    --hply;

    var from = game_list[hply].from;
    var dest = game_list[hply].dest;

    b[from] = b[dest];
    color[from] = color[dest];
    b[dest] = game_list[hply].capture;
    color[dest] = xside;

    if (b[from] == K)
        Kingloc[side] = from;
}

function Gen() {
    mc = first_move[ply];
    if (hply > 0)
        GenEp();
    GenCastle();

    for (var x = 0; x < 64; x++) {
        if (color[x] == side) {
            switch (b[x]) {
                case P:
                    GenPawn(x);
                    break;
                case N:
                    GenKnight(x);
                    break;
                case B:
                    GenBishop(x, NE);
                    GenBishop(x, SE);
                    GenBishop(x, SW);
                    GenBishop(x, NW);
                    break;
                case R:
                    GenRook(x, NORTH);
                    GenRook(x, EAST);
                    GenRook(x, SOUTH);
                    GenRook(x, WEST);
                    break;
                case Q:
                    GenDiag(x, NE);
                    GenDiag(x, SE);
                    GenDiag(x, SW);
                    GenDiag(x, NW);
                    GenStraight(x, NORTH);
                    GenStraight(x, EAST);
                    GenStraight(x, SOUTH);
                    GenStraight(x, WEST);
                    break;
                case K:
                    GenKing(x);
                    break;
                default:
                    break;
            }
        }
    }
    first_move[ply + 1] = mc;
}

function GenEp() {
    var ep = game_list[hply - 1].dest;

    if (b[ep] == 0 && color[ep] == xside && Math.abs(game_list[hply - 1].from - ep) == 16) {
        if (COL[ep] > 0 && color[ep - 1] == side && b[ep - 1] == P) {
            if (side == 0)
                AddCapture(ep - 1, ep + 8, 10);
            else
                AddCapture(ep - 1, ep - 8, 10);
        }
        if (COL[ep] < 7 && color[ep + 1] == side && b[ep + 1] == P) {
            if (side == 0)
                AddCapture(ep + 1, ep + 8, 10);
            else
                AddCapture(ep + 1, ep - 8, 10);
        }
    }
}

function GenCastle() {

    if (side == 0) {
        if (game_list[hply].castle_k0 > 0) {
            if (b[F1] == EMPTY && b[G1] == EMPTY) {
                AddMove(E1, G1);
            }
        }
        if (game_list[hply].castle_q0 > 0) {
            if (b[B1] == EMPTY && b[C1] == EMPTY && b[D1] == EMPTY) {
                AddMove(E1, C1);
            }
        }
    } else {
        if (game_list[hply].castle_k1 > 0) {
            if (b[F8] == EMPTY && b[G8] == EMPTY)
                AddMove(E8, G8);
        }
        if (game_list[hply].castle_q1 > 0) {
            if (b[B8] == EMPTY && b[C8] == EMPTY && b[D8] == EMPTY)
                AddMove(E8, C8);
        }
    }
}

function GenPawn(x) {
    x = Number(x);

    if (side == 0) {
        if (b[x + 8] == EMPTY) {
            AddMove(x, x + 8);
            if (ROW[x] == 1 && b[x + 16] == EMPTY)
                AddMove(x, x + 16);
        }
        if (COL[x] > 0 && color[x + 7] == 1 && b[x + 7] < EMPTY)
            AddCapture(x, x + 7, b[x + 7] * 10);
        if (COL[x] < 7 && color[x + 9] == 1 && b[x + 9] < EMPTY)
            AddCapture(x, x + 9, b[x + 9] * 10);
    } else {
        if (b[x - 8] == EMPTY) {
            AddMove(x, x - 8);
            if (ROW[x] == 6 && b[x - 16] == EMPTY)
                AddMove(x, x - 16);
        }
        if (COL[x] < 7 && color[x - 7] == 0 && b[x - 7] < EMPTY)
            AddCapture(x, x - 7, b[x - 7] * 10);
        if (COL[x] > 0 && color[x - 9] == 0 && b[x - 9] < EMPTY)
            AddCapture(x, x - 9, b[x - 9] * 10);
    }
}

function GenKnight(sq) {
    var k = 0;
    var sq2 = Knightmoves[sq][k++];
    while (sq2 > -1) {
        if (color[sq2] == EMPTY) {
            AddMove(sq, sq2);
        } else if (color[sq2] == xside) {
            AddCapture(sq, sq2, b[sq2] * 10 - 3);
        }
        sq2 = Knightmoves[sq][k++];
    }
}

function GenBishop(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 3);
            }
            break;
        }
        AddMove(x, sq);
        sq = Kmoves[sq][dir];
    }
}

function GenRook(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 5);
            }
            break;
        }
        AddMove(x, sq);
        sq = Kmoves[sq][dir];
    }
}

function GenDiag(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 9);
            }
            break;
        }
        AddMove(x, sq);
        sq = Kmoves[sq][dir];
    }
}

function GenStraight(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 9);
            }
            break;
        }
        AddMove(x, sq);
        sq = Kmoves[sq][dir];
    }
}

function GenKing(sq) {
    var k = 0;
    var sq2 = Kingmoves[sq][k++];
    while (sq2 > -1) {
        if (color[sq2] == EMPTY) {
            AddMove(sq, sq2);
        } else if (color[sq2] == xside) {
            AddCapture(sq, sq2, b[sq2] * 10);
        }
        sq2 = Kingmoves[sq][k++];
    }
}

function AddMove(x, sq) {
    move_list[mc].from = x;
    move_list[mc].dest = sq;
    move_list[mc].score = Hist[x][sq];
    mc++;
}

function AddCapture(x, sq, score) {
    move_list[mc].from = x;
    move_list[mc].dest = sq;
    move_list[mc].score = score + CAPTURE_SCORE;
    mc++;
}

function GenCaptures() {
    mc = first_move[ply];
    for (var x = 0; x < 64; x++) {
        if (color[x] == side) {
            switch (b[x]) {
                case P:
                    CapPawn(x);
                    break;
                case N:
                    CapKnight(x);
                    break;
                case B:
                    CapBishop(x, NE);
                    CapBishop(x, SE);
                    CapBishop(x, SW);
                    CapBishop(x, NW);
                    break;
                case R:
                    CapRook(x, EAST);
                    CapRook(x, SOUTH);
                    CapRook(x, WEST);
                    CapRook(x, NORTH);
                    break;
                case Q:
                    CapDiag(x, NE);
                    CapDiag(x, SE);
                    CapDiag(x, SW);
                    CapDiag(x, NW);
                    CapStraight(x, EAST);
                    CapStraight(x, SOUTH);
                    CapStraight(x, WEST);
                    CapStraight(x, NORTH);
                    break;
                case K:
                    CapKing(x);
                    break;
                default:
                    break;
            }
        }
    }
    first_move[ply + 1] = mc;
}

function CapPawn(x) {
    x = Number(x);
    if (side == 0) {
        if (COL[x] > 0 && color[x + 7] == xside) {
            AddCapture(x, x + 7, b[x + 7] * 10);
        }
        if (COL[x] < 7 && color[x + 9] == xside) {
            AddCapture(x, x + 9, b[x + 9] * 10);
        }
    } else {
        if (COL[x] < 7 && color[x - 7] == xside) {
            AddCapture(x, x - 7, b[x - 7] * 10);
        }
        if (COL[x] > 0 && color[x - 9] == xside) {
            AddCapture(x, x - 9, b[x - 9] * 10);
        }
    }
}

function CapKnight(sq) {
    var k = 0;
    var sq2 = Knightmoves[sq][k++];
    while (sq2 > -1) {
        if (color[sq2] == xside) {
            AddCapture(sq, sq2, b[sq] * 10 - 3);
        }
        sq2 = Knightmoves[sq][k++];
    }
}

function CapBishop(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 3);
            }
            break;
        }
        sq = Kmoves[sq][dir];
    }
}

function CapRook(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 5);
            }
            break;
        }
        sq = Kmoves[sq][dir];
    }
}

function CapDiag(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 9);
            }
            break;
        }
        sq = Kmoves[sq][dir];
    }
}

function CapStraight(x, dir) {
    var sq = Kmoves[x][dir];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (color[sq] == xside) {
                AddCapture(x, sq, b[sq] * 10 - 9);
            }
            break;
        }
        sq = Kmoves[sq][dir];
    }
}

function CapKing(x) {
    var k = 0;
    var sq = Kingmoves[x][k++];
    while (sq > -1) {
        if (color[sq] == xside) {
            AddCapture(x, sq, b[sq] * 10);
        }
        sq = Kingmoves[x][k++];
    }
}

function ShowList() {
    var s = "";
    var x;
    for (x = first_move[ply]; x < first_move[ply + 1]; x++) {
        s += Algebraic(move_list[x].from) + "-" + Algebraic(move_list[x].dest);
        s += " " + move_list[x].score + "\n";
    }
    s += " num " + (first_move[ply + 1] - first_move[ply]);
    postMessage("alert= " + s);
}

function LoadDiagram(ts) {
    var x, y, n = 0;

    for (x = 0; x < 64; x++) {
        b[x] = EMPTY;
        color[x] = EMPTY;
    }
    for (x = 0; x < 2; x++) {
        for (y = 0; y < 6; y++) {
            bit_pieces[x][y] = 0;
        }
    }
    SetCastle(0);

    currentkey = 0;
    currentlock = 0;
    currentpawnkey = 0;
    currentpawnlock = 0;

    var count = 0, i = 0, j;
    var a;

    for (x = 0; x < ts.length; x++) {
        a = ts.charAt(x);
        if (Number(a) >= 0 && Number(a) <= 8) {
            i += Number(a);
        }
        j = FLIP_BOARD[i];
        if (i < 64) {
            switch (a) {
                case 'K': AddPiece(0, 5, j); Kingloc[0] = j; i++; break;
                case 'Q': AddPiece(0, 4, j); i++; break;
                case 'R': AddPiece(0, 3, j); i++; break;
                case 'B': AddPiece(0, 2, j); i++; break;
                case 'N': AddPiece(0, 1, j); i++; break;
                case 'P': AddPiece(0, 0, j); i++; break;
                case 'k': AddPiece(1, 5, j); Kingloc[1] = j; i++; break;
                case 'q': AddPiece(1, 4, j); i++; break;
                case 'r': AddPiece(1, 3, j); i++; break;
                case 'b': AddPiece(1, 2, j); i++; break;
                case 'n': AddPiece(1, 1, j); i++; break;
                case 'p': AddPiece(1, 0, j); i++; break;
            }
        } else {
            if (ts.charAt(x + 1) == 'w') {
                side = 0; xside = 1;
            }
            if (ts.charAt(x + 1) == 'b') {
                side = 1; xside = 0;
            }
            switch (a) {
                case 'K': game_list[0].castle_k0 = 1; break;
                case 'Q': game_list[0].castle_q0 = 1; break;
                case 'k': game_list[0].castle_k1 = 1; break;
                case 'q': game_list[0].castle_q1 = 1; break;
                default: break;
            }
        }
    }
    return 0;
}

function IsLegal2(start, dest) {
    first_move[0] = 0;
    ply = 0;
    Gen();
    for (var i = 0; i < first_move[1]; i++) {
        if (move_list[i].from == start && move_list[i].dest == dest) {
            return i;
        }
    }
    postMessage("alert=illegal");
    return -1;
}

function GetResult() {
    var count = 0;
    first_move[0] = 0;
    ply = 0;
    Gen();
    for (var i = 0; i < first_move[1]; ++i) {
        if (MakeMove(move_list[i].from, move_list[i].dest)) {
            TakeBack();
            count = 1;
            break;
        }
    }
    if (count == 0) {
        if (Attack(xside, Kingloc[side])) {
            if (side == 0) {
                postMessage("alert=0-1 {Black mates}");
            } else {
                postMessage("alert=1-0 {White mates}");
            }
        } else {
            postMessage("alert=1/2-1/2 {Stalemate}");
        }
        return 1;
    }
    SetMaterial();
    if (Pawn_mat[0] == 0 && Pawn_mat[1] == 0 && Piece_mat[0] <= 300 && Piece_mat[1] <= 300) {
        postMessage("alert=1/2-1/2 {Draw by no mating material}");
        return 1;
    }
    if (reps() >= 3) {
        postMessage("alert=1/2-1/2 {Draw by repetition}");
        return 1;
    }
    if (fifty >= 100) {
        postMessage("alert=1/2-1/2 {Draw by fifty move rule}");
        fifty = 0;
        return 1;
    }
    return 0;
}

function SetMaterial() {
    for (var x = 0; x < 2; x++) {
        Pawn_mat[x] = 0;
        Piece_mat[x] = 0;
    }
    for (var x = 0; x < 64; x++) {
        if (b[x] < K) {
            if (b[x] == P) {
                Pawn_mat[color[x]] += 100;
            } else {
                Piece_mat[color[x]] += piece_value[b[x]];
            }
        }
    }
}

function Debug(n) {
    try {
        throw "error";
    }
    catch (err) {
        postMessage("alert= " + err + " debug n " + n + " ply " + ply + " hply " + hply);

    }
}