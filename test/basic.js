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
	driver.testTautology(["<=>", A, ["-", ["-", A]]]);
	
	driver.testTautology(["-", ["&",  A, ["-", A]]]);
	driver.testTautology(["<=>", ["=>", A, B], ["|", ["-", A], B]]);
	driver.testTautology(["<=>", ["<=>", A, B], ["&", ["=>", A, B], ["=>", B, A]]]);
	
	// Законы де Мограна
	driver.testTautology(["<=>", ["-", ["&", A, B]], ["|", ["-", A], ["-", B]]]);
	driver.testTautology(["<=>", ["-", ["|", A, B]], ["&", ["-", A], ["-", B]]]);
	
	// Коммутативность
	driver.testTautology(["<=>", ["|", A, B], ["|", B, A]]);
	driver.testTautology(["<=>", ["&", A, B], ["&", B, A]]);
	driver.testTautology(["<=>", ["<=>", A, B], ["<=>", B, A]]);
	
	// Ассоциативность
	driver.testTautology(["<=>", ["|", A, ["|", B, C]], ["|", ["|", A, B], C]]);
	driver.testTautology(["<=>", ["&", A, ["&", B, C]], ["&", ["&", A, B], C]]);
	// Поглощение
	driver.testTautology(["<=>", ["|", A, ["&", A, B]], A]);
	driver.testTautology(["<=>", ["&", A, ["|", A, B]], A]);
	// Контрапозиция
	driver.testTautology(["<=>", ["=>", A, B], ["=>", ["-", B] , ["-", A]]]);
});

describe('basic - corner cases', function() {
	it('Недопустимый оператор в выражении', function() {
		assert.throws(() => {
			ASTtoString(['*', A]);
		});
	});
	it('Нельзя добавлять формулы в закрытую секвенцию', function() {
		assert.throws(() => {
			var seq = new Sequence();
			seq.add({ spec: true, ast: A });
			seq.add({ spec: false, ast: A });
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

describe('basic - relevance', function() {
	it('(B|A)&(-B|C)', function() {
		Sequence.DEBUG = true;
		var seq = new Sequence();
		seq.add({ spec: true, ast: A });
		seq.add({ spec: true, ast: ["|", B, A] });
		seq.add({ spec: true, ast: ["|", ["-", B], C] });
		assert.equal(seq.cut(), 'A&B&C');
		Sequence.DEBUG = false;
	});
	it('(-B|C)&(B|A)', function() {
		Sequence.DEBUG = true;
		var seq = new Sequence();
		seq.add({ spec: true, ast: A });
		seq.add({ spec: true, ast: ["|", ["-", B], C] });
		seq.add({ spec: true, ast: ["|", B, A] });
		assert.equal(seq.cut(), 'A&B&C');
		Sequence.DEBUG = false;
	});
});
