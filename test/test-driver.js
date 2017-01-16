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
		//Sequence.DEBUG = true;
		var seq = new Sequence();
		seq.add({ spec: true, ast: ast });
		assert.ok(seq.cut(), 'Тавтология должна иметь модель.');
		//console.dir(extractSemanticTable(seq), {depth: 10});

		seq = new Sequence();
		seq.add({ spec: false, ast: ast });
		var model = seq.cut();
		assert.equal(model, false, 'Отрицание тавтологии не должно иметь моделей. '+model);
		//console.dir(extractSemanticTable(seq), {depth: 10});
		//Sequence.DEBUG = false;
	});
}

function extractSemanticTable(seq){
	return {
		_: Object.keys(seq._).map(key => (seq._[key].spec ? "T:" : "F:")+key),
		childs: seq.childs&&seq.childs.length&&seq.childs.map(child => extractSemanticTable(child))
	};
}

	if (Sequence.DEBUG) {

	}

module.exports = {
  	testFormula,
  	testTautology
};
