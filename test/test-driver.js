"use strict";
var assert = require('assert');
var {Sequence, ASTtoString} = require('../seq-calc');

function testFormula(ast, trueVal, falseVal){
  	var str = ASTtoString(ast);
	it(str, function() {
		var seq = new Sequence();
		seq.add({ spec: true, ast: ast });
		assert.equal(seq.cut(), trueVal, str+' должна быть истинна при: '+trueVal);

		seq = new Sequence();
		seq.add({ spec: false, ast: ast });
		assert.equal(seq.cut(), falseVal, str+' должна быть ложна при: '+falseVal);
	});
}

function testTautology(ast) {
  	var str = ASTtoString(ast);
	it(str, function() {
		var seq = new Sequence();
		seq.add({ spec: true, ast: ast });
		assert.ok(seq.cut(), 'Тавтология должна иметь модель.');

		seq = new Sequence();
		seq.add({ spec: false, ast: ast });
		assert.equal(seq.cut(), false, 'Отрицание тавтологии не должно иметь моделей.');
	});
}
module.exports = {
  	testFormula,
  	testTautology
};