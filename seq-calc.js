"use strict";

(function() {
  
  // https://www.dropbox.com/s/rre1xz4pzq074nh/orang2016.pdf?dl=0

  // Приоритеты используются, чтобы опускать скобки, не влияющие на порядок вычисления
  function opPriority(op){
    var p = {"-":10, "&":20, "|":20, "=>":30, "<=>":30}[op];
    if (!p) throw "Недопустимый оператор: "+op;
    return p;
  }

  function ASTtoString(ast, priority=100){
    if (!Array.isArray(ast)){
      return ast;
    }
    var op = ast[0], pr = opPriority(op);
    if (op=="-") return "-"+ASTtoString(ast[1], pr);
    var res = ast.slice(1).map(el => ASTtoString(el, pr)).join(op);
    if (priority <= pr) res = "("+res+")";
    return res;
  }
  function ASTExtractAtoms(ast, map={}){
    if (Array.isArray(ast)){
      ast.slice(1).forEach(el => ASTExtractAtoms(el, map));
    } else {
      map[ast] = true;
    }
  }

  // Правила вывода
  var Rules = [
    {spec: true, op: "&", fn : (args) => {
      var alt = [];
      args.forEach(a => alt.push({spec: true, ast: a}));
      return [alt];
    }},
    {spec: false, op: "&", fn : (args) => {
      var res = [];
      args.forEach(a => res.push([{spec: false, ast: a}]));
      return res;  
    }},
    {spec: true, op: "|", fn : (args) => {
      var res = [];
      args.forEach(a => res.push([{spec: true, ast: a}]));
      return res;
    }},
    {spec: false, op: "|", fn : (args) => {
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
    {spec: true, op: "<=>", fn : ([a, b]) => {
      return [
        [{spec: true,  ast: a}, {spec: true,  ast: b}],
        [{spec: false, ast: a}, {spec: false, ast: b}]
      ];
    }},
    {spec: false, op: "<=>", fn : ([a, b]) => {
      return [
        [{spec: false, ast: a}, {spec: true,  ast: b}],
        [{spec: true,  ast: a}, {spec: false, ast: b}]
      ];
    }},
    {spec: true, op: "-", fn : ([a]) => {
      return [[{spec: false, ast: a}]];
    }},
    {spec: false, op: "-", fn : ([a]) => {
      return [[{spec: true, ast: a}]];
    }}
  ];
  var RuleMap = {};
  var ruleKey = (spec, op) => (spec ? "1" : "0") + op;
  Rules.forEach((r) => {
    var key = ruleKey(r.spec, r.op);
    RuleMap[key] = r.fn;
  });
 
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
    return seq._[name];
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
    if (existSf) { 
      return existSf.spec === sf.spec;
    }
    // Добавляем формулу
    this._[name] = sf;
    /* TODO: здесь лезть в сечения нельзя, т.к. часть из них унаследовано от родительской секвенции
    // Обновим релевантность сечений
    // TODO: надо или обновлять релевантность только для атомов, или в картах сечений держать все подформулы (а не только атомы)
    this.queue.forEach(cut => {
      if (cut.map[name]) cut.rel++;
    });
    */
    // Применим к с-формуле соответствующее правило вывода
    var rule = RuleMap[ruleKey(sf.spec, sf.ast[0])];
    if (!rule) return true; // нет правила - с-формула полностью разобрана
    var alts = rule(sf.ast.slice(1));
    if (alts.length>1) {
      // Разбор с-формулы требует сечения секвенции
      var map = {};
      // Составим карту атомов сечения
      alts.forEach(alt => alt.forEach(sf => ASTExtractAtoms(sf.ast, map)));
      // var rel = Object.keys(map).filter(name => this.find(name)).length;
      // Добавляем сечение
      this.queue.push({ alts, map });
      return true;
    }
    // если разбиение формулы не приводит к сечению секвенции - добавим все подформулы к текущей секвенции
    var alt = alts[0];
    for (var i=0; i<alt.length; i++) {
      var res = this._add(alt[i]);
      if (!res) return false; // формула противоречит секвенции
    }
    return true;
  };

  // Модель, на которой секвенция выполнена.
  // К методу имеет смысл обращаться только у секвенций с пустой очередью
  sProto.getModel = function(){
    if (this.queue.length) throw "Модель секвенции не достроена. Выполните сечение секвенции: seq.cut()";
    var astModel = ['&'],
        seq = this;
    // Пробегаем по всем родительским секвенциям
    while (seq){
      //console.log(seq._);
      for (var name in seq._){
        var sf = seq._[name];
        // Если формула атомарна - включаем ее в модель
        if (typeof sf.ast === 'string') {
          astModel.push(sf.spec ? sf.ast : ["-", sf.ast]);
        }
      }
      seq = seq.parent;
    }
    astModel.sort();
    return ASTtoString(astModel);
  };

  // Рекурсивное сечение секвенции
  sProto.cut = function(){
    if (!this.isOpen) return false; // Секвенция уже закрыта
    if (!this.queue.length) return this.getModel(); // нет сечений в очереди - модель готова
    
    var childQueue = this.queue.slice();
    // Выбираем самое релевантное сечение: в котором наименьшее число еще неопределенных атомов
    var minRel = Infinity, minRelIndex = 0;
    for (var i = 0; i < childQueue.length; i++) {
      var rel = Object.keys(childQueue[i].map).filter(name => !this.find(name)).length;
      if (rel <= minRel) { // При прочих равных берем последнюю
        minRel = rel;
        minRelIndex = i;
      }
    }
    if (Sequence.DEBUG) {
      this.childs = [];
    }
    var alts = childQueue.splice(minRelIndex, 1)[0].alts; // childQueue.pop().alts; // 
    for (var i=0; i<alts.length; i++) {
      var alt = alts[i];
      var seq = new Sequence(this, childQueue.slice());
      if (Sequence.DEBUG) {
        this.childs.push(seq);
      }
      // В каждом сечении добавляем формулы из текущей рассматриваемой альтернативы
      alt.forEach(sf => seq.isOpen && seq.add(sf));
      if (seq.isOpen) {
        var res = seq.cut();
        // Если не возникло противоречие после сечения дочерней секвенции - модель готова
        if (res) return res;
      }
    }
    // Если ни одно сечение не дало модели - секвенция закрывается
    this.isOpen = false;
    return this.isOpen;
  };

  var ns = typeof window === 'undefined' ? module.exports : window;
  ns.Sequence = Sequence;
  ns.ASTtoString = ASTtoString;

}());
