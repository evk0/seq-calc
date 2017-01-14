"use strict";

(function() {
  
  // https://www.dropbox.com/s/rre1xz4pzq074nh/orang2016.pdf?dl=0

  var sentence = "(A && B => A || B) || __Cregserg_123 || !C";
  function tokenize(str){
    var arr = str.match(/(\w+|&&|\|\||=>|!|\(|\))/gi);
    return arr;
  }

  //console.log(tokenize(sentence));

  function opPriority(op){
    var p = {"!":10, "&&":20, "||":20, "=>":30};
    return p[op]||100;
  }

  function ASTtoString(ast, priority=100){
    if (!Array.isArray(ast)){
      return ast;
    }
    var op = ast[0], pr = opPriority(op);
    if (op=="!") return "!"+ASTtoString(ast[1], pr);
    var res = ast.slice(1).map(el => ASTtoString(el, pr)).join(op);
    if (priority <= pr) res = "("+res+")";
    return res;
  }
  //console.log(ASTtoString("A"));

  // Правила вывода
  // TODO: ASTtoString() можно не делать - все равно этот ключ по факту не используется
  var Rules = [
    {spec: true, op: "&&", fn : (args) => {
      var alt = [];
      args.forEach(a => alt.push({spec: true, ast: a}));
      return [alt];
    }},
    {spec: false, op: "&&", fn : (args) => {
      var res = [];
      args.forEach(a => res.push([{spec: false, ast: a}]));
      return res;  
    }},
    {spec: true, op: "||", fn : (args) => {
      var res = [];
      args.forEach(a => res.push([{spec: true, ast: a}]));
      return res;
    }},
    {spec: false, op: "||", fn : (args) => {
      var alt = [];
      args.forEach(a => alt.push({spec: false, ast: a}));
      return [alt];
    }},
    {spec: true, op: "=>", fn : ([a, b]) => {
      return [[{spec: false, ast: a}], [{spec: true,  ast: b}]];
    }},
    {spec: false, op: "=>", fn : ([a, b]) => {
      return [[{spec: true,  ast: a}, {spec: false, ast: b}]];
    }},
    {spec: true, op: "!", fn : ([a]) => {
      return [[{spec: false, ast: a}]];
    }},
    {spec: false, op: "!", fn : ([a]) => {
      return [[{spec: true, ast: a}]];
    }}
  ];
  var RuleMap = {};
  var ruleKey = (spec, op) => (spec ? "1" : "0") + op;
  Rules.forEach((r) => {
    var key = ruleKey(r.spec, r.op);
    RuleMap[key] = r.fn;
  });
  //console.log(RuleMap);
 
  /* 
    Класс Sequence
  */

  function Sequence(parent, queue){
    this.parent = parent||null;
    this._ = {};
    this.queue = queue || (this.parent ? this.parent.queue.slice() : []);
    this.isOpen = true;
  }
  var sProto = Sequence.prototype;

  // найти в дереве указанную с-формулу
  sProto.find = function(name){
    var seq = this;
    while (!seq._[name] && seq.parent) seq = seq.parent;
    return this._[name];
  }

  // добавить с-формулу, если она не противоречит секвенции
  sProto.add = function(sf){
    if (!this.isOpen) throw 'Нельзя добавлять формулы в закрытую секвенцию!';
    this.isOpen = this._add(sf);
    return this.isOpen;
  };
  sProto._add = function(sf){
    var name = ASTtoString(sf.ast);
    // Поищем с-формулу в секвенции и проверим, не противоречит ли она
    var existSf = this.find(name);
    if (existSf && existSf.spec !== sf.spec) return false;
    this._[name] = sf;
    // Применим к с-формуле соответствующее правило вывода
    var rule = RuleMap[ruleKey(sf.spec, sf.ast[0])];
    if (!rule) return true; // нет правила - с-формула полностью разобрана
    var alts = rule(sf.ast.slice(1));
    if (alts.length>1) {
      // Разбор с-формулы требует сечения секвенции
      this.queue.push(alts);
      return true;
    }
    //console.log(1, this._);
    // если разбиение формулы не приводит к сечению секвенции - добавим все подформулы к текущей секвенции
    var alt = alts[0];
    for (var i=0; i<alt.length; i++) {
      var res = this._add(alt[i]);
      if (!res) return false; // формула противоречит секвенции
    }
    //console.log(2, this._);
    return true;
  };

  // Модель, на которой секвенция выполнена.
  // К методу имеет смысл обращаться только у секвенций с пустой очередью
  sProto.getModel = function(){
    if (this.queue.length) throw "Модель секвенции не достроена. Выполните сечение секвенции: seq.cut()";
    var astModel = ['&&'],
        seq = this;
    // Пробегаем по всем родительским секвенциям
    while (seq){
      //console.log(seq._);
      for (var name in seq._){
        var sf = seq._[name];
        // Если формула атомарна - включаем ее в модель
        if (typeof sf.ast === 'string') {
          astModel.push(sf.spec ? sf.ast : ['!', sf.ast]);
        }
      }
      seq = seq.parent;
    }
    return ASTtoString(astModel);
  };

  // Рекурсивное сечение секвенции
  sProto.cut = function(){
    if (!this.isOpen) return false; // Секвенция уже закрыта
    if (!this.queue.length) return this.getModel(); // нет сечений в очереди - модель готова
    
    var childQueue = this.queue.slice();
    var alts = childQueue.pop();
    for (var i=0; i<alts.length; i++) {
      var alt = alts[i];
      // В каждом сечении всегда добавляется только одна новая формула
      var seq = new Sequence(this, childQueue.slice());
      var sf = alt[0];
      var isOpened = seq.add(sf);
      if (isOpened) {
        var res = seq.cut();
        // Если не возникло противоречие после сечения дочерней секвенции - модель готова
        if (res) {
          return res;
        }
      }
    }
    // Если ни одно сечение не дало модели - секвенция закрывается
    this.isOpen = false;
    return this.isOpen;
  };

  var ns = typeof window === 'undefined' ? module.exports : window;
  ns.Sequence = Sequence;

  // Тесты

  var ast = ["||", ["=>", ["&&", "A", "B"], ["||", "A", "B"]], "C", ["!", ["||", "A", "C"]]];
  var str = ASTtoString(ast);

  var seq = new Sequence();
  seq.add({ spec: true, ast: ast });
  console.log(str, 'Истинна при:', seq.cut());
  
  seq = new Sequence();
  seq.add({ spec: false, ast: ast });
  console.log(str, 'Ложна при:', seq.cut());

}());
