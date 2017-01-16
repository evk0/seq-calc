"use strict";
var assert = require('assert');
var driver = require('./test-driver');
var {Sequence, ASTtoString} = require('../seq-calc');

/*
	Текущий уровень оптимизации не позволяет проверять выполнимость формул на теориях такого размера.
	Можно было бы позаимствовать правила сокращения из алгоритма CDCL,
	но это потребует приведения формул к КНФ, что сведет на нет часть преимуществ семантических таблиц.

	Файл sudoku.js будет удален, только если появится уверенность, что комбинаторный взрыв на задаче SAT - 
	неустранимое свойство семантических таблиц. А пока пусть повисит, как немой укор за недодуманную мысль :)
*/

/*

    Порядок нумерации ячеек в квадрате (нумерация квадратов на поле аналогична):
	-------------
	|0,0|0,1|0,2|
	-------------
	|1,0|1,1|1,2|
	-------------
	|2,0|2,1|2,2|
	-------------

	Пропозициональные переменные (2*3*3*3*9 = 486 шт.):
	Rikln - "в строке  i квадрата [k,l] имеется значение n"
	Cjkln - "в колонке j квадрата [k,l] имеется значение n"
	0 <= i,j,k,l <= 2
	1 <= n <= 9

	Утверждение "в ячейке [i,j] квадрата [k,l] стоит значение n" кодируется формулой:
	Rikln & Cjkln

	Чтобы соблюсти правила судоку, необходимо ввести ограничения, какие комбинации значений переменных допустимы.
	
	1. В одной ячейке стоит ровно одно значение:
	Rikln & Cjkln <=> &{ -Riklx & -Cjklx | x != n }

	2. Значение встречается в строке строго один раз:
	Rik0n <=> -Rik1n & -Rik2n
	Rik1n <=> -Rik0n & -Rik2n
	Rik2n <=> -Rik0n & -Rik1n

	3. Значение встречается в колонке строго один раз:
	Cj0ln <=> -Cj1ln & -Cj2ln
	Cj1ln <=> -Cj0ln & -Cj2ln
	Cj2ln <=> -Cj0ln & -Cj1ln

	4. Значение встречается в квадрате строго один раз:
	R0kln <=> -R1kln & -R2kln
	R1kln <=> -R0kln & -R2kln
	R2kln <=> -R0kln & -R1kln
	C0kln <=> -C1kln & -C2kln
	C1kln <=> -C0kln & -C2kln
	C2kln <=> -C0kln & -C1kln

	Итого теория судоку требует 3 формулы на каждую переменную: 486*3 = 1458 формулы.

*/
// Получение имен пропозициональных переменных по их индексам
function R(i,k,l,n){ return "R"+i+k+l+n; }
function C(j,k,l,n){ return "C"+j+k+l+n; }

// 1. В одной ячейке стоит ровно одно значение
function astArrayCell(i, j, k, l, n){
	var conj = ["&"];
	for (var x=1; x<=9; x++) if (x != n) {
		conj.push(["-", R(i,k,l,x)]);
		conj.push(["-", C(j,k,l,x)]);
	}
	return [
		["<=>", ["&", R(i,k,l,n), C(j,k,l,n)], conj]
	]
}
// 4. Значение встречается в квадрате строго один раз:
function astArraySquare(k,l,n){
	function f(p,x,k,l,n){
		var y  = x==0 ? 1 : 0,
			z  = x==2 ? 1 : 2,
			fn = p=="R" ? R : C;
		return ["<=>", fn(x,k,l,n), ["&", ["-", fn(y,k,l,n)], ["-", fn(z,k,l,n)]]];
	}
	return [
		f("R",0,k,l,n), f("R",1,k,l,n), f("R",2,k,l,n),
		f("C",0,k,l,n), f("C",1,k,l,n), f("C",2,k,l,n)
	];
}

function astCell(i, j, k, l, n){
	var conj = ["&"];
	for (var x=1; x<=9; x++) if (x != n) {
		conj.push(["-", R(i,k,l,x)]);
		conj.push(["-", C(j,k,l,x)]);
	}
	for (var x=0; x<=2; x++) { 
		if (x != i) conj.push(["-", R(x,k,l,n)]);
		if (x != j) conj.push(["-", C(x,k,l,n)]);
	}
	return ["<=>", ["&", R(i,k,l,n), C(j,k,l,n)], conj];
}

/*
	Простые тесты с одним квадратом 9*9: 54 переменные и 108 формул в теории.
*/
var simpleSudokuTheory = new Sequence();
/*
for (var n=1; n<=9; n++)
	astArraySquare(0, 0, n).forEach(ast => simpleSudokuTheory.add({spec: true, ast: ast}));
*/
for (var i=0; i<=2; i++) for (var j=0; j<=2; j++) for (var n=1; n<=9; n++)
	simpleSudokuTheory.add({spec: true, ast: astCell(i, j, 0, 0, n)});

	
describe('sudoku - simple', function() {
	it('В теории должно быть 108 формул', function() {
		//assert.equal(Object.keys(simpleSudokuTheory._).length, 108);
	});
	/*
	var seq = new Sequence(simpleSudokuTheory);
	seq.add({spec: true, ast: ["&", "R0001", "C0001"]});
	seq.add({spec: true, ast: ["&", "R0002", "C1002"]});
	seq.add({spec: true, ast: ["&", "R0003", "C2003"]});
	seq.add({spec: true, ast: ["&", "R1004", "C0004"]});
	seq.add({spec: true, ast: ["&", "R1005", "C1005"]});
	seq.add({spec: true, ast: ["&", "R1006", "C2006"]});
	seq.add({spec: true, ast: ["&", "R2007", "C0007"]});
	seq.add({spec: true, ast: ["&", "R2008", "C1008"]});
	seq.add({spec: true, ast: ["&", "R2009", "C2009"]});
	console.log(Object.keys(seq.parent._).join('\n'));
	console.log(Object.keys(seq.parent._).length);
	var m = seq.cut();
	m = m.split('&').filter(f => f[0]!="-");
	console.log(m);
	*/
});
/*
	А теперь полные тесты судоку
*/
	var fullSudokuTheory = new Sequence();
	for (var i=0; i<=2; i++)
		for (var j=0; j<=2; j++)
			for (var k=0; k<=2; k++)
				for (var l=0; l<=2; l++)
					for (var n=1; n<=9; n++)
						astArrayCell(i, j, k, l, n).forEach(ast => fullSudokuTheory.add({spec: true, ast: ast}));
	console.log(Object.keys(fullSudokuTheory._).length);

/*

	R1003&C0003<=>
	-R1001&-C0001&
	-R1002&-C0002&
	-R1004&-C0004&
	-R1005&-C0005&
	-R1006&-C0006&
	-R1007&-C0007&
	-R1008&-C0008&
	-R1009&-C0009&
	
	-R0003&-C1003
	-R2003&-C2003
*/