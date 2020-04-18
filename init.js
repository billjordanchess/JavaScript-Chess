function Create2DArray(r,c1)
{
var x =  []; x.length =  r;
for (var i =  0; i <  r; i++) 
{
x[i] =  []; x[i].length =  c1;
   for (var j =  0; j <  c1; j++) 
   {
     x[i][j] =  0;
   }
}
return x;
}
function init_board()
{
	var i;
	for (i = 0; i < 64; ++i) 
	{
		c[i] = init_color[i];
		b[i] = init_piece[i];
	}
	side = 0;
	xside = 1;
	fifty = 0;
	ply = 0;
	hply = 0;
	first_move[0] = 0;
	Kingloc[0] = 4;
	Kingloc[1] = 60;
	SetCastle(1);
	SetBoard();
}

    function SetImages()
    {
    Letters[0] = "blank.jpg";
    Letters[1] = "fa.jpg";
    Letters[2] = "fb.jpg";
    Letters[3] = "fc.jpg";
    Letters[4] = "fd.jpg";
    Letters[5] = "fe.jpg";
    Letters[6] = "ff.jpg";
    Letters[7] = "fg.jpg";
    Letters[8] = "fh.jpg";
    Numbers[0] = "blank.jpg";
    Numbers[1] = "r1.jpg";
    Numbers[2] = "r2.jpg";
    Numbers[3] = "r3.jpg";
    Numbers[4] = "r4.jpg";
    Numbers[5] = "r5.jpg";
    Numbers[6] = "r6.jpg";
    Numbers[7] = "r7.jpg";
    Numbers[8] = "r8.jpg";
    WhiteImg[0][0] = "wp.jpg";
    WhiteImg[1][0] = "wn.jpg";
    WhiteImg[2][0] = "wb.jpg";
    WhiteImg[3][0] = "wr.jpg";
    WhiteImg[4][0] = "wq.jpg";
    WhiteImg[5][0] = "wk.jpg";
    WhiteImg[6][0] = "w.jpg";

    WhiteImg[11][0] = "a1.jpg";
    WhiteImg[12][0] = "a2.jpg";
    WhiteImg[13][0] = "a3.jpg";
    WhiteImg[14][0] = "a4.jpg";
    WhiteImg[15][0] = "a5.jpg";
    WhiteImg[16][0] = "a6.jpg";
    WhiteImg[17][0] = "a7.jpg";
    WhiteImg[18][0] = "a8.jpg";
    WhiteImg[19][0] = "a9.jpg";

    WhiteImg[0][1] = "wp2.jpg";
    WhiteImg[1][1] = "wn2.jpg";
    WhiteImg[2][1] = "wb2.jpg";
    WhiteImg[3][1] = "wr2.jpg";
    WhiteImg[4][1] = "wq2.jpg";
    WhiteImg[5][1] = "wk2.jpg";
    WhiteImg[6][1] = "b.jpg";//w2

    BlackImg[0][0] = "bp.jpg";
    BlackImg[1][0] = "bn.jpg";
    BlackImg[2][0] = "bb.jpg";
    BlackImg[3][0] = "br.jpg";
    BlackImg[4][0] = "bq.jpg";
    BlackImg[5][0] = "bk.jpg";
    BlackImg[6][0] = "b.jpg";

    BlackImg[0][1] = "bp2.jpg";
    BlackImg[1][1] = "bn2.jpg";
    BlackImg[2][1] = "bb2.jpg";
    BlackImg[3][1] = "br2.jpg";
    BlackImg[4][1] = "bq2.jpg";
    BlackImg[5][1] = "bk2.jpg";
    BlackImg[6][1] = "b2.jpg";

    BlackImg[6][0] = "w.jpg";
    BlackImg[6][1] = "b.jpg";

    BlackImg[7][0] = "bx.jpg";
    BlackImg[8][0] = "bx.jpg";
    BlackImg[7][1] = "bx2.jpg";
    BlackImg[8][1] = "bx2.jpg";
    BlackImg[7][0] = "bx.jpg";
    BlackImg[8][0] = "bx.jpg";
    BlackImg[7][1] = "bx2.jpg";
    BlackImg[8][1] = "bx2.jpg";
    }
    var flip_board = [
 56,  57,  58,  59,  60,  61,  62,  63,
 48,  49,  50,  51,  52,  53,  54,  55,
 40,  41,  42,  43,  44,  45,  46,  47,
 32,  33,  34,  35,  36,  37,  38,  39,
 24,  25,  26,  27,  28,  29,  30,  31,
 16,  17,  18,  19,  20,  21,  22,  23,
  8,   9,  10,  11,  12,  13,  14,  15,
  0,   1,   2,   3,   4,   5,   6,   7
];
function Algebraic(x)
{
var c1 = col[x];
var r = row[x];
var a = "";
switch(c1)
{
	case 0: a="a"; break;
	case 1: a="b"; break;
	case 2: a="c"; break;
	case 3: a="d"; break;
	case 4: a="e"; break;
	case 5: a="f"; break;
	case 6: a="g"; break;
	case 7: a="h"; break;
}
return a + (r+1);
}