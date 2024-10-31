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
const A2 = 8, B2 = 9, C2 = 10, D2 = 11, E2 = 12, F2 = 13, G2 = 14, H2 = 15;
const A3 = 16, B3 = 17, C3 = 18, D3 = 19, E3 = 20, F3 = 21, G3 = 22, H3 = 23;
const A4 = 24, B4 = 25, C4 = 26, D4 = 27, E4 = 28, F4 = 29, G4 = 30, H4 = 31;
const A5 = 32, B5 = 33, C5 = 34, D5 = 35, E5 = 36, F5 = 37, G5 = 38, H5 = 39;
const A6 = 40, B6 = 41, C6 = 42, D6 = 43, E6 = 44, F6 = 45, G6 = 6, H6 = 7;
const A7 = 48, B7 = 49, C7 = 50, D7 = 51, E7 = 52, F7 = 52, G7 = 54, H7 = 55;
const A8 = 56, B8 = 57, C8 = 58, D8 = 59, E8 = 60, F8 = 61, G8 = 62, H8 = 63;

var fen_name;
var fixed_depth;
var max_time = 0;
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
var move_count;
var side = 0, xside = 1;
var fifty = 0;
var ply = 0, hply = 0;
var nodes = 0;

var bug;//

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

function Create3DArray(r, c1, c2) {
    var x = [];
    x.length = r;
    for (var i = 0; i < r; i++) {
        x[i] = [];
        x[i].length = c1;
        for (var j = 0; j < c1; j++) {
            x[i][j] = [];
            x[i][j].length = c2;
            for (var k = 0; k < c1; k++) {
                x[i][j][k] = 0;
            }
        }
    }
    return x;
}

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
    var move, from, to;
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
        case "time":
            max_time = Number(a2);
            break;
        case "takeback":
            if (hply > 0) {
                TakeBack();
                CopyBoard();
                postMessage("add=");
            }
            break;
        case "forward":
            ForwardMove();
            CopyBoard();
            postMessage("add=");
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
        case "save"://
            postMessage("fen=" + SaveDiagram());
            break;
        case "board"://
            CopyBoard();
            break;
        case "play":
            move = a2;
            from = FirstPart(a2);
            to = SecondPart(a2);
            if (IsLegal2(from, to) == -1) {
                postMessage("illegal=" + from + " " + to);
                return;
            }
            MakeMove(from, to);
            CopyBoard();
            break;
    }
}

function ForwardMove() {
    //Debug("alert=for 1 " + Algebraic(game_list[hply].from) + Algebraic(game_list[hply].to));
    MakeMove(game_list[hply].from, game_list[hply].to);
    CopyBoard();
}

function CompMove(a2) {
    const start = Date.now();
    Think();
    const millis = Date.now() - start;
    var nps = 0;
    if (millis > 0) nps = nodes * 1000 / millis;
    side = Number(a2);
    xside = side ^ 1;
    var piece = board[root_start];
    var capture = board[root_dest];
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
        a += board[x];
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
        switch (board[x]) {
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

function Move() {
    var from = 0;
    var to = 0;
    var promote = 0;
    var score = 0;
}

function Game() {
    var from = 0;
    var to = 0;
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

var Kingloc = []; Kingloc.length = 2;
var Table_score = []; Table_score.length = 2;
var Pawn_mat = []; Pawn_mat.length = 2;
var Piece_mat = []; Piece_mat.length = 2;

var board = []; board.length = 64;
var color = []; color.length = 64;
var first_move = []; first_move.length = 64;

var mask = []; mask.length = 64;
var not_mask = []; not_mask.length = 64;

var Hist = new Create2DArray(64, 64);
var King_endgame = new Create2DArray(2, 64);
var square_score = new Create3DArray(2, 7, 64);
var Passed = new Create2DArray(2, 64);
var Kmoves = new Create2DArray(64, 9);
var Knightmoves = new Create2DArray(64, 9);
var Kingmoves = new Create2DArray(64, 9);
var mask_passed = new Create2DArray(2, 64);
var mask_isolated = new Create2DArray(2, 64);
var bit_pieces = new Create2DArray(2, 7);
var pawnmove = new Create2DArray(2, 64);//
var pawndouble = new Create2DArray(2, 64);//
var pawncaptures = new Create2DArray(2, 64);//
var pawncaptureleft = new Create2DArray(2, 64);//
var pawncaptureright = new Create2DArray(2, 64);//
var rank = new Create2DArray(2, 64);//

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

var board = [
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

var c = CAPTURE_SCORE;
const PawnCapScore = [0 + c, c + 100, c + 200, c + 300, c + 400, 0 + c];
const KnightCapScore = [c - 30, c + 70, c + 170, c + 270, c + 370, c + 0];
const BishopCapScore = [c - 30, c + 70, c + 170, c + 270, c + 370, c + 0];
const RookCapScore = [c - 50, c + 50, c + 150, c + 250, c + 350, c + 0];
const QueenCapScore = [c - 90, c + 10, c + 110, c + 210, c + 310, c + 0];
const KingCapScore = [c + 0, c + 100, c + 200, c + 300, c + 400, c + 0];
//board[sq] * 10 - 9

function SetUp() {
    SetTables();
    SetHashTables();
    SetPawnHash();
    SetPawns();
    SetMoves();
    SetBits();
    SetPassed();
    InitBoard();
}

function SetTables() {
    for (var x = 0; x < MOVE_STACK; x++) {
        move_list.push(new Move());
        game_list.push(new Game());
    }
    for (x = 0; x < 64; x++) {
        first_move[x] = 0;
    }
    for (x = 0; x < 64; x++) {
        square_score[0][P][x] = PAWN_SCORE[x] + 100;
        square_score[0][N][x] = KNIGHT_SCORE[x] + 300;
        square_score[0][B][x] = BISHOP_SCORE[x] + 300;
        square_score[0][R][x] = ROOK_SCORE[x] + 500;
        square_score[0][Q][x] = QUEEN_SCORE[x] + 900;
        square_score[0][K][x] = KING_SCORE[x];
        square_score[0][6][x] = 0;
    }
    var f;
    for (x = 0; x < 64; x++) {
        f = FLIP_BOARD[x];
        square_score[1][P][x] = PAWN_SCORE[f] + 100;
        square_score[1][N][x] = KNIGHT_SCORE[f] + 300;
        square_score[1][B][x] = BISHOP_SCORE[f] + 300;
        square_score[1][R][x] = ROOK_SCORE[f] + 500;
        square_score[1][Q][x] = QUEEN_SCORE[f] + 900;
        square_score[1][K][x] = KING_SCORE[f];
        square_score[1][6][x] = 0;
        King_endgame[0][x] = KING_ENDGAME_SCORE[x] - square_score[0][5][x];
        King_endgame[1][x] = KING_ENDGAME_SCORE[x] - square_score[1][5][x];
        Passed[0][x] = PASSED_SCORE[f];
        Passed[1][x] = PASSED_SCORE[x];
    }
}

function SetPawns() {
    for (x = A2; x <= H7; x++) {
        pawnmove[0][x] = x + 8;
        pawnmove[1][x] = x - 8;
    }
    for (x = A2; x <= H2; x++) {
        pawndouble[0][x] = x + 16;
    }
    for (x = A7; x <= H7; x++) {
        pawndouble[1][x] = x - 16;
    }
    for (x = A2; x <= H7; x++) {
        if (COL[x] > 0) {
            pawncaptureleft[0][x] = x + 7;
            pawncaptureleft[1][x] = x - 9;
        }
        else {
            pawncaptureleft[0][x] = x;
            pawncaptureleft[1][x] = x;
        }
        if (COL[x] < 7) {
            pawncaptureright[0][x] = x + 9;
            pawncaptureright[1][x] = x - 7;
        }
        else {
            pawncaptureright[0][x] = x;
            pawncaptureright[1][x] = x;
        }
    }
    for (var x = 0; x < 64; x++) {
        rank[0][x] = ROW[x];
        rank[1][x] = 7 - ROW[x];
    }
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
}

function SetPassed() {
    for (var x = 0; x < 64; x++) {
        mask_passed[0][x] = 0;
        mask_passed[1][x] = 0;

        for (var y = 0; y < 64; y++) {
            if (Math.abs(COL[x] - COL[y]) < 2) {
                if (ROW[x] < ROW[y] && ROW[y] < 7)
                    mask_passed[0][x] |= (1 << y);
                if (ROW[x] > ROW[y] && ROW[y] > 0)
                    mask_passed[1][x] |= (1 << y);
            }
        }
    }
}

function InitBoard() {
    var i;
    for (i = 0; i < 64; i++) {
        color[i] = INIT_COLOR[i];
        board[i] = INIT_PIECE[i];
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
        if (board[i] != EMPTY) {
            s = color[i];
            AddPiece(s, board[i], i);
        }
    }
    currentkey = GetKey();
    currentlock = GetLock();
}

function LineCheck(s, sq, d, p) {
    sq = Kmoves[sq][d];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (board[sq] == p && color[sq] == s)
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
            if ((board[sq] == p1 || board[sq] == p2) && color[sq] == s)
                return true;
            break;
        }
        sq = Kmoves[sq][d];
    }
    return false;
}

function LineCheck3(s, sq, d, sq2) {//
    sq = Kmoves[sq][d];
    while (sq > -1) {
        if (color[sq] != EMPTY) {
            if (sq == sq2)
                return true;
            break;
        }
        sq = Kmoves[sq][d];
    }
    return false;
}

function Attack(s, sq) {
    sq = Number(sq);

    if (color[pawncaptureleft[1 - s][sq]] == s &&
        board[pawncaptureleft[1 - s][sq]] == P)
        return true;
    if (color[pawncaptureright[1 - s][sq]] == s &&
        board[pawncaptureright[1 - s][sq]] == P)
        return true;

    var k = 0;
    var sq2 = Knightmoves[sq][0];

    while (sq2 > -1) {
        if (color[sq2] == s && board[sq2] == N)
            return true;
        k++;
        sq2 = Knightmoves[sq][k];
    }
    if (LineCheck2(s, sq, NE, B, Q)) return true;
    if (LineCheck2(s, sq, NW, B, Q)) return true;
    if (LineCheck2(s, sq, SW, B, Q)) return true;
    if (LineCheck2(s, sq, SE, B, Q)) return true;

    if (LineCheck2(s, sq, NORTH, R, Q)) return true;
    if (LineCheck2(s, sq, SOUTH, R, Q)) return true;
    if (LineCheck2(s, sq, EAST, R, Q)) return true;
    if (LineCheck2(s, sq, WEST, R, Q)) return true;

    if (Kingloc[s] > -1 && Math.abs(COL[sq] - COL[Kingloc[s]]) < 2 && Math.abs(ROW[sq] - ROW[Kingloc[s]]) < 2)
        return true;

    return false;
}

function LowestAttacker(s, x) {
    x = Number(x);

    if (color[pawncaptureleft[xside][x]] == s &&
        board[pawncaptureleft[xside][x]] == P)
        return pawncaptureleft[xside][x];
    if (color[pawncaptureright[xside][x]] == s &&
        board[pawncaptureright[xside][x]] == P)
        return pawncaptureright[xside][x];

    var k = 0;
    var sq = Knightmoves[x][k];

    while (sq > -1) {
        if (color[sq] == s && board[sq] == N)
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

function IsCheck(s, p, sq, k) {
    sq = Number(sq);
    if (p == P) {
        if (pawncaptureleft[s][sq] == k)
            return true;
        if (pawncaptureright[s][sq] == k)
            return true;
        return false;
    }
    if (p == N) {
        var c = 0;
        var sq2 = Knightmoves[sq][0];

        while (sq2 > -1) {
            if (Knightmoves[sq][c] == k)
                return true;
            c++;
            sq2 = Knightmoves[sq][c];
        }
        return false;
    }
    if (p == B || p == Q) {
        if (NE_DIAG[sq] == NE_DIAG[k]) {
            if (sq < k && LineCheck3(s, sq, NE, k)) return true;
            else if (LineCheck3(s, sq, SE, k)) return true;
        }
        if (NW_DIAG[sq] == NW_DIAG[k]) {
            if (sq < k && LineCheck3(s, sq, NW, k)) return true;
            else if (LineCheck3(s, sq, SW, k)) return true;
        }
    }

    if (p == R || p == Q) {
        if (COL[sq] == COL[k]) {
            if (sq < k && LineCheck3(s, sq, NORTH, k)) return true;
            else if (LineCheck3(s, sq, SOUTH, k)) return true;
        }
        if (ROW[sq] == ROW[k]) {
            if (sq < k && LineCheck3(s, sq, EAST, k)) {
                return true;
            }
            else if (LineCheck3(s, sq, WEST, k)) return true;
        }
    }
    return false;
}

// hash tables etc
const HASHSIZE = 500000;
const MAXPAWNHASH = 65536;
const PAWNHASHSIZE = 32768;

var whitehash = new Create2DArray(6, 64);
var blackhash = new Create2DArray(6, 64);
var whitelock = new Create2DArray(6, 64);
var blacklock = new Create2DArray(6, 64);

var piecehash = new Create3DArray(2, 6, 64);
var piecelock = new Create3DArray(2, 6, 64);

var pawnhash = new Create2DArray(2, 64);
var pawnlock = new Create2DArray(2, 64);
var hashpawns = new Create2DArray(2, MAXPAWNHASH);

var hashpos = new Create2DArray(2, HASHSIZE + 100000);//
var white_hashtable = [];
var black_hashtable = [];
var white_hash_pawns = [];
var black_hash_pawns = [];
var hashpawns = [];//

function hashtable() {
    var hashlock = 0;
    var from = 0;
    var to = 0;
}

function Hashtable() {
    this.hashlock = 0;
    this.from = 0;
    this.to = 0;
}
/*
function createHashtableArray() {
    // Initialize a [2][500000] array
     table = Array.from({ length: 2 }, () =>
        Array.from({ length: 500000 }, () => new Hashtable())
    );

    return table; // Return the 2D array of hashtable objects
}
*/

// Example usage
//myHashtableArray = createHashtableArray();

function hashp() {
    var hashlock = 0;
    var from = 0;
    var to = 0;
}

function hashpawn() {
    var hashlock = 0;
    var score = 0;
}

var clashes = 0, collisions = 0;
var hash_start, hash_dest;

function SetPawnHash() {
    var test = []; //test.length = 2;//??
    //for (var s = 0; s < 2; x++)
    for (var x = 0; x < 100; x++) {
        //test[s][x] = new hashp();
        test.push(new hashp());
    }
    /*
    for (var s = 0; s < 2; x++)
        for (var x = 0; x < HASHSIZE + 100000; x++) {
            hashpos[s][x] = new hashp();
            //hashpos[s].push(new hashp());
        }
        */
    //*
    for (x = 0; x < HASHSIZE + 100000; x++) {
        white_hashtable.push(new hashp());
        black_hashtable.push(new hashp());
    }
    //*/
    for (var x = 0; x < MAXPAWNHASH; x++) {
        hashpawns.push(new hashpawn());
    }
}

function SetHashTables() {
    for (var s = 0; s < 2; s++) {
        for (var x = 0; x < 64; x++) {
            pawnhash[s][x] = Random(PAWNHASHSIZE);
            pawnlock[s][x] = Random(PAWNHASHSIZE);
        }
    }
    for (var s = 0; s < 2; s++) {
        for (var p = 0; p < 6; p++) {
            for (var x = 0; x < 64; x++) {
                piecehash[s][p][x] = Random(HASHSIZE);
                piecelock[s][p][x] = Random(HASHSIZE);
            }
        }
    }
}

function Random(x) {
    return Math.floor(Math.random() * x);
}

function AddHash(s, m) {
    //*
    if (s == 0) {
        white_hashtable[currentkey].hashlock = currentlock;
        white_hashtable[currentkey].from = m.from;
        white_hashtable[currentkey].to = m.to;
    } else {
        black_hashtable[currentkey].hashlock = currentlock;
        black_hashtable[currentkey].from = m.from;
        black_hashtable[currentkey].to = m.to;
    }
    /*/
    hashpos[s][currentkey].hashlock = currentlock;
    hashpos[s][currentkey].from = m.from;
    hashpos[s][currentkey].to = m.to;*/
}

function AddKey(s, p, x) {
    try {
        currentkey ^= piecehash[s][p][x];
        currentlock ^= piecelock[s][p][x];
    }
    catch (err) {
        //DisplayPV(ply);
        var a1 = "alert= " + err + " addkey s " + s + " p " + p + " x " + x;
        postMessage(a1 + " ply " + ply + " hply " + hply);
    }
}

function GetKey() {
    var key = 0;
    for (var x = 0; x < 64; x++) {
        if (board[x] != EMPTY) {
            key ^= piecehash[color[x]][board[x]][x];
        }
    }
    return key;
}

function GetLock() {
    var lock = 0;
    for (var x = 0; x < 64; x++) {
        if (board[x] != EMPTY) {
            lock ^= piecelock[color[x]][board[x]][x];
        }
    }
    return lock;
}

function LookUp(s) {
    /*
    if (hashpos[s][currentkey].hashlock != currentlock)
        return false;
    hash_start = hashpos[s][currentkey].from;
    hash_dest = hashpos[s][currentkey].to;*/
    //*
    if (s == 0) {
        if (white_hashtable[currentkey].hashlock != currentlock)
            return false;
        hash_start = white_hashtable[currentkey].from;
        hash_dest = white_hashtable[currentkey].to;
    } else {
        if (black_hashtable[currentkey].hashlock != currentlock)
            return false;
        hash_start = black_hashtable[currentkey].from;
        hash_dest = black_hashtable[currentkey].to;
    }
    //*/
    return true;
}

function GetPawnKey() {
    var key = 0;
    for (var x = 0; x < 64; x++) {
        if (board[x] == P) {
            key ^= pawnhash[color[x]][x];
        }
    }
    return key;
}

function GetPawnLock() {
    var key = 0;
    for (var x = 0; x < 64; x++) {
        if (board[x] == P) {
            key ^= pawnlock[color[x]][x];
        }
    }
    return key;
}

function AddPawnKey(s, x) {
    currentpawnkey ^= pawnhash[s][x];
    currentpawnlock ^= pawnlock[s][x];
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
            if (ROW[Kingloc[0]] < 2 && color[pawnmove[0][Kingloc[0]]] == 0 && board[pawnmove[0][Kingloc[0]]] == P)
                score += 10;
        }
    }

    if (Kingloc[1] > -1) {
        if (bit_pieces[0][Q] == 0)
            score -= King_endgame[1][Kingloc[1]];
        else {
            if (ROW[Kingloc[1]] > 5 && color[pawnmove[1][Kingloc[1]]] == 1 && board[pawnmove[1][Kingloc[1]]] == P)
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
        if (board[x] == P) {
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

    var score;

    ply = 0;
    nodes = 0;
    first_move[0] = 0;
    NewPosition();

    Gen();
    var count = 0;
    for (var i = first_move[ply]; i < first_move[ply + 1]; i++) {
        if (!MakeMove(move_list[i].from, move_list[i].to))
            continue;
        TakeBack();
        count++;
        if (count > 1)
            break;
    }
    if (count == 1)
        max_depth = 1;

    for (var x1 = 0; x1 < 64; x1++) {
        for (var y1 = 0; y1 < 64; y1++)
            Hist[x1][y1] = 0;
    }
    const start = Date.now();
    for (var i = 1; i <= max_depth; i++) {
        currentmax = i;

        currentkey = GetKey();
        currentlock = GetLock();

        deep = 0;

        score = Search(-10000, 10000, i);
        if (score > 9998)
            postMessage("add=Checkmate!<br>");
        else {
            if (i > deep)
                deep = i;
            postMessage("add=" + i + " deepest " + deep + " " + score + " " + " " + nodes + "<br>");
        }

        if (LookUp(side))
            DisplayPV(i);

        if (score > 9000 || score < -9000)
            break;
        if (max_time > 0 && Number(Date.now() - start) > 0 && Number(Date.now() - start) > max_time * 1000) {
            max_depth = i;
            break;
        }
    }
}

function Search(alpha, beta, depth) {
    if (ply && Reps2())
        return 0;

    if (bit_pieces[0][P] == 0 && bit_pieces[1][P] == 0 && Table_score[0] < 400 && Table_score[1] < 400)
        return 0;

    if (depth < 1)
        return CaptureSearch(alpha, beta);

    nodes++;

    if (ply > MAX_PLY - 2)
        return Eval();

    var InCheck = 0, Check = 0;

    if (Attack(xside, Kingloc[side])) {
        InCheck = 1;
    }

    Gen();

    if (LookUp(side))
        SetHashMove();

    var bestmove = new Move();
    var bestscore = -10001;
    var count = 0;
    var d;
    var score = 0;
    var zero_flag = 0;
    var from, to;
    var e = 10000, diff = 0;

    for (var i = first_move[ply]; i < first_move[ply + 1]; i++) {
        if (zero_flag == 0) {
            Sort(i);
            if (move_list[i].score == 0)
                zero_flag = 1;
        }
        from = move_list[i].from;
        to = move_list[i].to;
        if (InCheck == 0)
            Check = (IsCheck(side, board[from], to, Kingloc[xside]))
        else
            Check = 0;

        if (Check) {
            d = depth;
        }
        else {
            if (move_list[i].score > 0 || ply < 2 || InCheck == 1)
                d = depth - 1;
            else
                d = depth - 2;
        }
        if (d < 2 && count > 0 && Check == 0 && board[to] == 6 &&
            !(board[from] == P && rank[side][from] == 6)) {
            if (e == 10000)
                e = Eval();
            if (board[from] == K && bit_pieces[xside][Q] == 0)
                diff = King_endgame[side][to] - King_endgame[side][from];
            else
                diff = square_score[side][board[from]][to] - square_score[side][board[from]][from];
            if (e + diff < alpha) {
                nodes++;
                continue;
            }
        }
        if (!MakeMove(from, to))
            continue;
        count++;
        score = -Search(-beta, -alpha, d);
        TakeBack();

        if (score > bestscore) {
            bestscore = score;
            bestmove = move_list[i];
            if (ply == 0) {
                root_start = from;
                root_dest = to;
                root_score = score;
                //postMessage(" best " + root_start + " " + root_dest);
            }
        }
        if (score > alpha) {
            if (score >= beta) {
                if (board[to] == EMPTY)
                    Hist[from][to] += depth;
                AddHash(side, move_list[i]);
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

    AddHash(side, bestmove);
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

    for (var i = first_move[ply]; i < first_move[ply + 1]; i++) {
        Sort(i);

        if (eval + piece_value[board[move_list[i].to]] < alpha)
            continue;

        score = ReCaptureSearch(move_list[i].from, move_list[i].to);

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
                AddHash(side, move_list[bestmove]);
            return beta;
        }
        return eval;
    }

    return alpha;
}

function ReCaptureSearch(attacker, sq) {
    var lowest;
    var taker = 0;
    var captures = 0;
    var score = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    score[0] = piece_value[board[sq]];
    score[1] = piece_value[board[attacker]];

    var total_score = 0;

    while (taker < 10) {
        if (!MakeRecapture(attacker, sq))
            break;
        captures++;
        nodes++;
        taker++;

        lowest = LowestAttacker(side, sq);

        if (lowest > -1) {
            score[taker + 1] = piece_value[board[lowest]];
            if (score[taker] > score[taker - 1] + score[taker + 1]) {
                taker--;
                break;
            }
        } else
            break;
        attacker = lowest;
    }

    while (taker > 1) {
        if (score[taker - 1] >= score[taker - 2])
            taker -= 2;
        else
            break;
    }

    for (var x = 0; x < taker; x++) {
        if (x % 2 == 0)
            total_score += score[x];
        else
            total_score -= score[x];
    }

    if (ply > deep)
        deep = ply;

    while (captures) {
        UnMakeRecapture();
        captures--;
    }
    return total_score;
}

function Reps() {
    var r = 0;
    for (var i = hply - 4; i >= hply - fifty; i -= 2) {
        if (game_list[i].hash == currentkey && game_list[i].lock == currentlock)
            r++;
    }
    return r;
}

function Reps2() {
    for (var i = hply - 4; i >= hply - fifty; i -= 2) {
        if (game_list[i].hash == currentkey && game_list[i].lock == currentlock)
            return 1;
    }
    return 0;
}

function Sort(from) {
    var bestscore = 0;
    var bestmove = from;
    for (var i = from; i < first_move[ply + 1]; i++)
        if (move_list[i].score > bestscore) {
            bestscore = move_list[i].score;
            bestmove = i;
        }
    var temp = move_list[from];
    move_list[from] = move_list[bestmove];
    move_list[bestmove] = temp;
}

function SetHashMove() {
    for (var x = first_move[ply]; x < first_move[ply + 1]; x++) {
        if (move_list[x].from == hash_start && move_list[x].to == hash_dest) {
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
        text += LongAlgebraic(board[hash_start], hash_start, hash_dest, board[hash_dest]) + " ";
        MakeMove(hash_start, hash_dest);
    }
    while (ply)
        TakeBack();
    postMessage("add= PV " + i + "\\" + deep + " " + text);
    //postMessage("<br>");
}

function UpdatePiece(s, p, from, to) {
    AddKey(s, p, from);
    AddKey(s, p, to);
    board[to] = p;
    color[to] = s;
    board[from] = EMPTY;
    color[from] = EMPTY;
    Table_score[s] -= square_score[s][p][from];
    Table_score[s] += square_score[s][p][to];

    bit_pieces[s][p] &= not_mask[from];
    bit_pieces[s][p] |= mask[to];
    if (p == P) {
        AddPawnKey(s, from);
        AddPawnKey(s, to);
    } else if (p == K)
        Kingloc[s] = to;
}

function RemovePiece(s, p, sq) {
    AddKey(s, p, sq);
    board[sq] = EMPTY;
    color[sq] = EMPTY;
    Table_score[s] -= square_score[s][p][sq];

    bit_pieces[s][p] &= not_mask[sq];
    if (p == P)
        AddPawnKey(s, sq);
}

function AddPiece(s, p, sq) {
    AddKey(s, p, sq);
    board[sq] = p;
    color[sq] = s;
    Table_score[s] += square_score[s][p][sq];

    bit_pieces[s][p] |= mask[sq];
    if (p == P)
        AddPawnKey(s, sq);
}

function MakeMove(from, to) {
    // Handle castling moves
    if (Math.abs(COL[from] - COL[to]) == 2 && board[from] == K) {
        if (Attack(xside, from) || Attack(xside, to))
            return false;
        if (to == G1) {
            if (Attack(1, F1))
                return false;
            UpdatePiece(0, K, E1, G1);
            UpdatePiece(0, R, H1, F1);
            game_list[hply].castle_k0 = 0;
            game_list[hply].castle_q0 = 0;
        }
        else if (to == C1) {
            if (Attack(1, D1))
                return false;
            UpdatePiece(0, K, E1, C1);
            UpdatePiece(0, R, A1, D1);
            game_list[hply].castle_k0 = 0;
            game_list[hply].castle_q0 = 0;
        }
        else if (to == G8) {
            if (Attack(0, F8))
                return false;
            UpdatePiece(1, K, E8, G8);
            UpdatePiece(1, R, H8, F8);
            game_list[hply].castle_k1 = 0;
            game_list[hply].castle_q1 = 0;
        }
        else if (to == C8) {
            if (Attack(0, D8))
                return false;
            UpdatePiece(1, K, E8, C8);
            UpdatePiece(1, R, A8, D8);
            game_list[hply].castle_k1 = 0;
            game_list[hply].castle_q1 = 0;
        }
        game_list[hply].from = from;
        game_list[hply].to = to;
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
    StoreMoveData(from, to);

    if (board[to] != EMPTY || board[from] == P)
        fifty = 0;
    else
        fifty++;

    // Handle en passant
    if (board[from] == P && board[to] == EMPTY && COL[from] != COL[to]) {
        if (side == 0)
            RemovePiece(xside, P, to - 8);
        else
            RemovePiece(xside, P, to + 8);
    }
    else if (board[to] != EMPTY) {
        // Capture move
        RemovePiece(xside, board[to], to);
    }
    if (to == A1 || from == A1)
        game_list[hply].castle_q0 = 0;
    else if (to == H1 || from == H1)
        game_list[hply].castle_k0 = 0;
    else if (from == E1) {
        game_list[hply].castle_q0 = 0;
        game_list[hply].castle_k0 = 0;
    }

    if (to == A8 || from == A8)
        game_list[hply].castle_q1 = 0;
    else if (to == H8 || from == H8)
        game_list[hply].castle_k1 = 0;
    else if (from == E8) {
        game_list[hply].castle_q1 = 0;
        game_list[hply].castle_k1 = 0;
    }

    // Handle pawn promotion
    if (board[from] == P && (ROW[to] == 0 || ROW[to] == 7)) {
        RemovePiece(side, P, from);
        AddPiece(side, Q, to);
        game_list[hply].promote = Q;
    }
    else {
        game_list[hply].promote = 0;
        UpdatePiece(side, board[from], from, to);
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

function StoreMoveData(from, to) {
    game_list[hply].from = from;
    game_list[hply].to = to;
    game_list[hply].capture = board[to];
    game_list[hply].fifty = fifty;
    game_list[hply].hash = currentkey;
    game_list[hply].lock = currentlock;
    game_list[hply].start_piece = board[from];

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
    const to = game_list[hply].to;
    const capture = game_list[hply].capture;

    // Restore the fifty-move rule counter
    fifty = game_list[hply].fifty;
    //*
    // Handle en passant undo
    if (board[to] === P && game_list[hply].capture == EMPTY && COL[from] !== COL[to]) {
        UpdatePiece(side, P, to, from);
        if (side === 0) {
            AddPiece(xside, P, to - 8);  // Restore captured pawn for black
        } else {
            AddPiece(xside, P, to + 8);  // Restore captured pawn for white
        }
        return;
    }

    if (game_list[hply].start_piece == P && (ROW[to] == 0 || ROW[to] == 7)) {
        AddPiece(side, P, from);
        RemovePiece(side, board[to], to);
    }
    else
        UpdatePiece(side, board[to], to, from);

    // Restore captured piece if any
    if (capture !== EMPTY) {
        AddPiece(xside, capture, to);
    }

    // Handle castling undo
    if (Math.abs(COL[from] - COL[to]) === 2 && board[from] === K) {
        UndoCastling(to);
    }
}

function UndoCastling(to) {
    if (to === G1) {
        UpdatePiece(0, R, F1, H1);
        game_list[hply].castle_k0 = 1;
    } else if (to === C1) {
        UpdatePiece(0, R, D1, A1);
        game_list[hply].castle_q0 = 1;
    } else if (to === G8) {
        UpdatePiece(1, R, F8, H8);
        game_list[hply].castle_k1 = 1;
    } else if (to === C8) {
        UpdatePiece(1, R, D8, A8);
        game_list[hply].castle_q1 = 1;
    }
}

function MakeRecapture(from, to) {
    game_list[hply].from = from;
    game_list[hply].to = to;
    game_list[hply].capture = board[to];
    ply++;
    hply++;
    board[to] = board[from];
    color[to] = color[from];
    board[from] = EMPTY;
    color[from] = EMPTY;

    if (board[to] == K)
        Kingloc[side] = to;
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
    var to = game_list[hply].to;

    board[from] = board[to];
    color[from] = color[to];
    board[to] = game_list[hply].capture;
    color[to] = xside;

    if (board[from] == K)
        Kingloc[side] = from;
}

function Gen() {
    move_count = first_move[ply];
    if (hply > 0)
        GenEp();
    GenCastle();

    for (var x = 0; x < 64; x++) {
        if (color[x] == side) {
            switch (board[x]) {
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
                    GenQueen(x, NE);
                    GenQueen(x, SE);
                    GenQueen(x, SW);
                    GenQueen(x, NW);
                    GenQueen(x, NORTH);
                    GenQueen(x, EAST);
                    GenQueen(x, SOUTH);
                    GenQueen(x, WEST);
                    break;
                case K:
                    GenKing(x);
                    break;
                default:
                    break;
            }
        }
    }
    first_move[ply + 1] = move_count;
}

function GenEp() {
    var ep = game_list[hply - 1].to;

    if (board[ep] == 0 && color[ep] == xside && Math.abs(game_list[hply - 1].from - ep) == 16) {
        if (COL[ep] > 0 && color[ep - 1] == side && board[ep - 1] == P) {
            if (side == 0)
                AddCapture(ep - 1, ep + 8, 10);
            else
                AddCapture(ep - 1, ep - 8, 10);
        }
        if (COL[ep] < 7 && color[ep + 1] == side && board[ep + 1] == P) {
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
            if (board[F1] == EMPTY && board[G1] == EMPTY) {
                AddMove(E1, G1);
            }
        }
        if (game_list[hply].castle_q0 > 0) {
            if (board[B1] == EMPTY && board[C1] == EMPTY && board[D1] == EMPTY) {
                AddMove(E1, C1);
            }
        }
    } else {
        if (game_list[hply].castle_k1 > 0) {
            if (board[F8] == EMPTY && board[G8] == EMPTY)
                AddMove(E8, G8);
        }
        if (game_list[hply].castle_q1 > 0) {
            if (board[B8] == EMPTY && board[C8] == EMPTY && board[D8] == EMPTY)
                AddMove(E8, C8);
        }
    }
}

function GenPawn(sq) {
    if (board[pawnmove[side][sq]] == EMPTY) {
        AddMove(sq, pawnmove[side][sq]);
        if (rank[side][sq] == 1 && board[pawndouble[side][sq]] == EMPTY)
            AddMove(sq, pawndouble[side][sq]);
    }
    if (color[pawncaptureleft[side][sq]] == xside)
        AddCapture(sq, pawncaptureleft[side][sq], PawnCapScore[board[pawncaptureleft[side][sq]]]);
    if (color[pawncaptureright[side][sq]] == xside)
        AddCapture(sq, pawncaptureright[side][sq], PawnCapScore[board[pawncaptureright[side][sq]]]);
}

function GenKnight(sq) {
    var c = 0;
    var sq2 = Knightmoves[sq][c++];
    while (sq2 > -1) {
        if (color[sq2] == EMPTY) {
            AddMove(sq, sq2);
        } else if (color[sq2] == xside) {
            AddCapture(sq, sq2, KnightCapScore[board[sq2]]);
        }
        sq2 = Knightmoves[sq][c++];
    }
}

function GenBishop(sq, dir) {
    var sq2 = Kmoves[sq][dir];
    while (sq2 > -1) {
        if (color[sq2] != EMPTY) {
            if (color[sq2] == xside) {
                AddCapture(sq, sq2, BishopCapScore[board[sq2]]);
            }
            break;
        }
        AddMove(sq, sq2);
        sq2 = Kmoves[sq2][dir];
    }
}

function GenRook(sq, dir) {
    var sq2 = Kmoves[sq][dir];
    while (sq2 > -1) {
        if (color[sq2] != EMPTY) {
            if (color[sq2] == xside) {
                AddCapture(sq, sq2, RookCapScore[board[sq2]]);
            }
            break;
        }
        AddMove(sq, sq2);
        sq2 = Kmoves[sq2][dir];
    }
}

function GenQueen(sq, dir) {
    var sq2 = Kmoves[sq][dir];
    while (sq2 > -1) {
        if (color[sq2] != EMPTY) {
            if (color[sq2] == xside) {
                AddCapture(sq, sq2, QueenCapScore[board[sq2]]);
            }
            break;
        }
        AddMove(sq, sq2);
        sq2 = Kmoves[sq2][dir];
    }
}

function GenKing(sq) {
    var c = 0;
    var sq2 = Kingmoves[sq][c++];
    while (sq2 > -1) {
        if (color[sq2] == EMPTY) {
            AddMove(sq, sq2);
        } else if (color[sq2] == xside) {
            AddCapture(sq, sq2, KingCapScore[board[sq2]]);
        }
        sq2 = Kingmoves[sq][c++];
    }
}

function AddMove(x, sq) {
    move_list[move_count].from = x;
    move_list[move_count].to = sq;
    move_list[move_count].score = Hist[x][sq];
    move_count++;
}

function AddCapture(x, sq, score) {
    move_list[move_count].from = x;
    move_list[move_count].to = sq;
    move_list[move_count].score = score;
    move_count++;
}

function GenCaptures() {
    move_count = first_move[ply];
    for (var x = 0; x < 64; x++) {
        if (color[x] == side) {
            switch (board[x]) {
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
                    CapQueen(x, NE);
                    CapQueen(x, SE);
                    CapQueen(x, SW);
                    CapQueen(x, NW);
                    CapQueen(x, EAST);
                    CapQueen(x, SOUTH);
                    CapQueen(x, WEST);
                    CapQueen(x, NORTH);
                    break;
                case K:
                    CapKing(x);
                    break;
                default:
                    break;
            }
        }
    }
    first_move[ply + 1] = move_count;
}

function CapPawn(sq) {
    if (color[pawncaptureleft[side][sq]] == xside)
        AddCapture(sq, pawncaptureleft[side][sq], PawnCapScore[board[pawncaptureleft[side][sq]]]);
    if (color[pawncaptureright[side][sq]] == xside)
        AddCapture(sq, pawncaptureright[side][sq], PawnCapScore[board[pawncaptureright[side][sq]]]);
}

function CapKnight(sq) {
    var c = 0;
    var sq2 = Knightmoves[sq][c++];
    while (sq2 > -1) {
        if (color[sq2] == xside) {
            AddCapture(sq, sq2, KnightCapScore[board[sq2]]);
        }
        sq2 = Knightmoves[sq][c++];
    }
}

function CapBishop(sq, dir) {
    var sq2 = Kmoves[sq][dir];
    while (sq2 > -1) {
        if (color[sq2] != EMPTY) {
            if (color[sq2] == xside) {
                AddCapture(sq, sq2, BishopCapScore[board[sq2]]);
            }
            break;
        }
        sq2 = Kmoves[sq2][dir];
    }
}

function CapRook(sq, dir) {
    var sq2 = Kmoves[sq][dir];
    while (sq2 > -1) {
        if (color[sq2] != EMPTY) {
            if (color[sq2] == xside) {
                AddCapture(sq, sq2, RookCapScore[board[sq2]]);
            }
            break;
        }
        sq2 = Kmoves[sq2][dir];
    }
}

function CapQueen(sq, dir) {
    var sq2 = Kmoves[sq][dir];
    while (sq2 > -1) {
        if (color[sq2] != EMPTY) {
            if (color[sq2] == xside) {
                AddCapture(sq, sq2, QueenCapScore[board[sq2]]);
            }
            break;
        }
        sq2 = Kmoves[sq2][dir];
    }
}

function CapKing(sq) {
    var c = 0;
    var sq2 = Kingmoves[sq][c++];
    while (sq2 > -1) {
        if (color[sq2] == xside) {
            AddCapture(sq, sq2, KingCapScore[board[sq2]]);
        }
        sq2 = Kingmoves[sq][c++];
    }
}

function LoadDiagram(ts) {
    var x, y, n = 0;

    for (x = 0; x < 64; x++) {
        board[x] = EMPTY;
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

function SaveDiagram(ts) {
    var n = 0;
    var a = "";
    var piece = "";
    var j;

    for (var i = 0; i < 64; i++) {
        j = FLIP_BOARD[i];
        if (board[j] != EMPTY && n > 0)
            a += n;
        switch (board[j]) {
            case P: piece = "p"; n = 0; break;
            case N: piece = "n"; n = 0; break;
            case B: piece = "b"; n = 0; break;
            case R: piece = "r"; n = 0; break;
            case Q: piece = "q"; n = 0; break;
            case K: piece = "k"; n = 0; break;
            case EMPTY: n++; break;
            default: break;
        }
        if (color[j] == 0)
            piece = piece.toUpperCase();
        if (color[j] != EMPTY)
            a += piece;
        if (COL[j] == 7) {
            if (n > 0)
                a += n;
            if (j < H8)
                a += "/";
            n = 0;
        }
    }
    if (side == 0)
        a += " w "
    else
        a += " b "
    if (game_list[0].castle_k0 == 1) a += 'K';
    if (game_list[0].castle_q0 == 1) a += 'Q';
    if (game_list[1].castle_k0 == 1) a += 'k';
    if (game_list[1].castle_q0 == 1) a += 'q';
    a += " - 0 1 ";
    return a;
}

function IsLegal2(start, to) {
    first_move[0] = 0;
    ply = 0;
    //GenEp();//??
    Gen();
    for (var i = 0; i < first_move[1]; i++) {
        if (move_list[i].from == start && move_list[i].to == to) {
            return i;
        }
    }
    /*
    Gen();
    for (var i = first_move[hply]; i < first_move[hply+1]; i++) {
        if (move_list[i].from == start && move_list[i].to == to) {
            return i;
        }
    }
    */
    postMessage("alert=illegal");
    return -1;
}

function GetResult() {
    var count = 0;
    first_move[0] = 0;
    ply = 0;
    Gen();
    for (var i = 0; i < first_move[1]; i++) {
        if (MakeMove(move_list[i].from, move_list[i].to)) {
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
    if (Reps() >= 3) {
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
        if (board[x] < K) {
            if (board[x] == P) {
                Pawn_mat[color[x]] += 100;
            } else {
                Piece_mat[color[x]] += piece_value[board[x]];
            }
        }
    }
}

function Debug(n) {
    try {
        throw "error";
    }
    catch (err) {
        //ShowList();
        postMessage("alert= hi " + n);
        //postMessage("alert= " + err);// + " debug n " + n);

    }
}

function ShowList() {
    var s = "";
    var x;
    for (x = first_move[ply]; x < first_move[ply + 1]; x++) {
        s += Algebraic(move_list[x].from) + "-" + Algebraic(move_list[x].to);
        s += " " + move_list[x].score + "\n";
    }
    s += " num " + (first_move[ply + 1] - first_move[ply]);
    postMessage("alert= " + s);
}

function Evasion() {
    move_count = first_move[ply];
    if (hply > 0)
        GenEp();

    for (var x = 0; x < 64; x++) {
        if (color[x] == side) {
            switch (board[x]) {
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
                    GenQueen(x, NE);
                    GenQueen(x, SE);
                    GenQueen(x, SW);
                    GenQueen(x, NW);
                    GenQueen(x, NORTH);
                    GenQueen(x, EAST);
                    GenQueen(x, SOUTH);
                    GenQueen(x, WEST);
                    break;
                default:
                    break;
            }
        }
    }
    first_move[ply + 1] = move_count;
}
