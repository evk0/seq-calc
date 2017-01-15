"use strict";
var assert = require('assert');
var driver = require('./test-driver');
var {Sequence, ASTtoString} = require('../seq-calc');

var A = "A", B = "B", C = "C";

describe('basic', function() {
	driver.testFormula(["|", ["=>", ["&", A, B], ["|", A, B]], C, ["-", ["|", A, C]]], '-A', false);
	driver.testTautology(["|", ["=>", ["&", A, B], ["|", A, B]], C, ["-", ["|", A, C]]]);
});

describe('basic - tautologies', function() {
	// Основные законы
	driver.testTautology(["|",  A, ["-", A]]);
	driver.testTautology(["=>", ["-", ["-", A]], A]);
	driver.testTautology(["=>", A, ["-", ["-", A]]]);
	driver.testTautology(["-", ["&",  A, ["-", A]]]);
	driver.testTautology(["&", 
		["=>", ["=>", A, B], ["|", ["-", A], B]], 
		["=>", ["|", ["-", A], B], ["=>", A, B]]
	]);
	
	// Законы де Мограна
	driver.testTautology(["&", 
		["=>", ["-", ["&", A, B]], ["|", ["-", A], ["-", B]]],
		["=>", ["|", ["-", A], ["-", B]], ["-", ["&", A, B]]]
	]);
	driver.testTautology(["&", 
		["=>", ["-", ["|", A, B]], ["&", ["-", A], ["-", B]]],
		["=>", ["&", ["-", A], ["-", B]], ["-", ["|", A, B]]]
	]);
	
	// Коммутативность
	driver.testTautology(["=>", ["|", A, B], ["|", B, A]]);
	driver.testTautology(["=>", ["&", A, B], ["&", B, A]]);
	
	// Ассоциативность
	driver.testTautology(["&", 
		["=>", ["|", A, ["|", B, C]], ["|", ["|", A, B], C]],
		["=>", ["|", ["|", A, B], C], ["|", A, ["|", B, C]]]
	]);
	driver.testTautology(["&", 
		["=>", ["&", A, ["&", B, C]], ["&", ["&", A, B], C]],
		["=>", ["&", ["&", A, B], C], ["&", A, ["&", B, C]]]
	]);
	// Поглощение
	driver.testTautology(["&", 
		["=>", ["|", A, ["&", A, B]], A],
		["=>", A, ["|", A, ["&", A, B]]]
	]);
	driver.testTautology(["&", 
		["=>", ["&", A, ["|", A, B]], A],
		["=>", A, ["&", A, ["|", A, B]]]
	]);
	// Контрапозиция
	driver.testTautology(["&", 
		["=>", ["=>", A, B], ["=>", ["-", B] , ["-", A]]],
		["=>", ["=>", ["-", B] , ["-", A]], ["=>", A, B]]
	]);
});

describe('basic - corner cases', function() {
	it('Недопустимый оператор в выражении', function() {
		assert.throws(() => {
			ASTtoString(['!', A]);
		});
	});
	it('Нельзя добавлять формулы в закрытую секвенцию', function() {
		assert.throws(() => {
			var seq = new Sequence();
			seq.add({ spec: true, ast: A });
			seq.add({ spec: true, ast: ["-", A] });
			seq.add({ spec: true, ast: B });
		});
	});
	it('Преждевременное обращение к модели', function() {
		assert.throws(() => {
			var seq = new Sequence();
			seq.add({ spec: true, ast: ["|", A, B] });
			seq.getModel();
		});
	});
	it('Вывод в дочерней секвенции', function() {
		var Th = new Sequence();
		Th.add({ spec: true, ast: A });

		var child = new Sequence(Th);
		child.add({ spec: true, ast: ["=>", A, ["-", B]] });
		assert.equal(child.cut(), '-B&A');
	});
});