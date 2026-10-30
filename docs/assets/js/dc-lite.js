/*
 * dc-lite.js — petit moteur de rendu, sans dépendance, pour les démos du portfolio.
 *
 * Il exécute tel quel le code des démos écrit pour le canvas Design :
 *   - une classe `Component extends DCLogic` avec renderVals(), state, setState() ;
 *   - un template HTML avec des trous {{chemin}}, <sc-for>, <sc-if> et des
 *     attributs d'événement onClick="{{handler}}", onChange, onKeyDown…
 *
 * Le rendu produit un arbre DOM neuf, puis le fusionne (morph) dans la page
 * existante : le focus clavier et la position de défilement sont conservés.
 */
(function () {
  'use strict';

  var HOLE = /\{\{([^}]*)\}\}/g;
  var WHOLE_HOLE = /^\s*\{\{([^}]*)\}\}\s*$/;
  var SVG_CASE = {
    viewbox: 'viewBox', preserveaspectratio: 'preserveAspectRatio', gradienttransform: 'gradientTransform',
    gradientunits: 'gradientUnits', patterntransform: 'patternTransform', patternunits: 'patternUnits',
    textlength: 'textLength', lengthadjust: 'lengthAdjust', stddeviation: 'stdDeviation'
  };

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (update) {
    var patch = typeof update === 'function' ? update(this.state, this.props) : update;
    this.state = Object.assign({}, this.state, patch);
    this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () {
    this.__schedule();
  };
  DCLogic.prototype.__schedule = function () {};

  // --- Évaluation des trous ------------------------------------------------

  function lookup(expr, scope) {
    var path = expr.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var value = scope;
    for (var i = 0; i < parts.length; i++) {
      if (value == null) return undefined;
      value = value[parts[i]];
    }
    return value;
  }

  // Valeur brute si l'attribut est un trou unique, sinon chaîne interpolée.
  function evaluate(text, scope) {
    var whole = WHOLE_HOLE.exec(text);
    if (whole) return lookup(whole[1], scope);
    return text.replace(HOLE, function (_, expr) {
      var v = lookup(expr, scope);
      return v == null || v === false ? '' : String(v);
    });
  }

  // --- Événements -----------------------------------------------------------

  function eventType(attrName, el) {
    var name = attrName.slice(2).toLowerCase();
    if (name === 'change') {
      var tag = el.localName;
      var type = (el.getAttribute('type') || '').toLowerCase();
      // Comme React : onChange suit chaque frappe ou chaque mouvement de curseur.
      if ((tag === 'input' && type !== 'checkbox' && type !== 'radio') || tag === 'textarea') return 'input';
      return 'change';
    }
    if (name === 'doubleclick') return 'dblclick';
    return name;
  }

  function dispatch(e) {
    var handler = this.__dcOn && this.__dcOn[e.type];
    if (typeof handler === 'function') handler(e);
  }

  function bindEvents(el, handlers) {
    el.__dcOn = handlers;
    if (!handlers) return;
    el.__dcBound = el.__dcBound || {};
    for (var type in handlers) {
      if (!el.__dcBound[type]) {
        el.addEventListener(type, dispatch);
        el.__dcBound[type] = true;
      }
    }
  }

  // --- Rendu du template ----------------------------------------------------

  function holeAttr(node, name) {
    return node.getAttribute('dc-' + name) || node.getAttribute(name) || '';
  }

  function renderChildren(src, scope, out) {
    for (var node = src.firstChild; node; node = node.nextSibling) renderNode(node, scope, out);
  }

  function renderNode(node, scope, out) {
    if (node.nodeType === 3) {
      var text = node.data;
      if (text.indexOf('{{') >= 0) {
        var v = evaluate(text, scope);
        text = v == null || v === false ? '' : String(v);
      }
      out.appendChild(document.createTextNode(text));
      return;
    }
    if (node.nodeType !== 1) return;

    var tag = node.localName;
    if (tag === 'sc-for') {
      var list = evaluate(holeAttr(node, 'list'), scope) || [];
      var as = node.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var inner = Object.create(scope);
        inner[as] = list[i];
        inner.$index = i;
        renderChildren(node, inner, out);
      }
      return;
    }
    if (tag === 'sc-if') {
      if (evaluate(holeAttr(node, 'value'), scope)) renderChildren(node, scope, out);
      return;
    }

    var el = document.importNode(node, false);
    var handlers = null;
    var props = null;
    for (var a = 0; a < node.attributes.length; a++) {
      var attr = node.attributes[a];
      if (/^(dc-)?hint-/.test(attr.name)) { el.removeAttribute(attr.name); continue; }
      if (attr.name.indexOf('dc-') !== 0) continue;
      // Attribut à trou, écrit dc-<nom> dans le template (le parseur HTML a mis le nom
      // en minuscules : onClick est devenu dc-onclick).
      el.removeAttribute(attr.name);
      var name = attr.name.slice(3);
      name = SVG_CASE[name] || name;
      if (/^on[a-z]+$/.test(name)) {
        handlers = handlers || {};
        handlers[eventType(name, node)] = evaluate(attr.value, scope);
        continue;
      }
      var value = evaluate(attr.value, scope);
      if (value == null || value === false) el.removeAttribute(name);
      else el.setAttribute(name, value === true ? '' : String(value));
      if (name === 'value' || name === 'checked') {
        props = props || {};
        props[name] = name === 'checked' ? !!value : (value == null ? '' : String(value));
      }
    }
    el.__dcProps = props;
    bindEvents(el, handlers);
    renderChildren(node.localName === 'template' ? node.content : node, scope, el);
    // Après les enfants : la valeur d'un <select> n'existe qu'une fois ses options créées.
    applyProps(el, props);
    out.appendChild(el);
  }

  // --- Fusion dans le DOM existant -----------------------------------------

  function applyProps(el, props) {
    if (!props) return;
    if ('value' in props && el.value !== props.value) el.value = props.value;
    if ('checked' in props && el.checked !== props.checked) el.checked = props.checked;
  }

  function morphChildren(target, source) {
    var next = Array.prototype.slice.call(source.childNodes);
    var prev = Array.prototype.slice.call(target.childNodes);
    for (var i = 0; i < next.length; i++) {
      if (i < prev.length) morphNode(prev[i], next[i]);
      else target.appendChild(next[i]);
    }
    for (var j = next.length; j < prev.length; j++) target.removeChild(prev[j]);
  }

  function morphNode(oldNode, newNode) {
    if (oldNode.nodeType !== newNode.nodeType || oldNode.nodeName !== newNode.nodeName) {
      oldNode.parentNode.replaceChild(newNode, oldNode);
      return;
    }
    if (oldNode.nodeType !== 1) {
      if (oldNode.data !== newNode.data) oldNode.data = newNode.data;
      return;
    }
    var i, attr;
    for (i = oldNode.attributes.length - 1; i >= 0; i--) {
      attr = oldNode.attributes[i];
      if (!newNode.hasAttributeNS(attr.namespaceURI, attr.localName)) oldNode.removeAttributeNS(attr.namespaceURI, attr.localName);
    }
    for (i = 0; i < newNode.attributes.length; i++) {
      attr = newNode.attributes[i];
      if (oldNode.getAttributeNS(attr.namespaceURI, attr.localName) !== attr.value) oldNode.setAttributeNS(attr.namespaceURI, attr.name, attr.value);
    }
    bindEvents(oldNode, newNode.__dcOn);
    morphChildren(oldNode, newNode);
    applyProps(oldNode, newNode.__dcProps);
  }

  // --- Montage --------------------------------------------------------------

  function mount(Component, root, template, props) {
    var instance = new Component(props || {});
    if (!instance.state) instance.state = {};
    var pending = false;
    var mounted = false;

    function render() {
      pending = false;
      var fresh = document.createElement('div');
      renderChildren(template.content, instance.renderVals(), fresh);
      morphChildren(root, fresh);
    }

    instance.__schedule = function () {
      if (!mounted || pending) return;
      pending = true;
      Promise.resolve().then(render);
    };

    render();
    mounted = true;
    if (typeof instance.componentDidMount === 'function') instance.componentDidMount();
    window.addEventListener('pagehide', function () {
      if (typeof instance.componentWillUnmount === 'function') instance.componentWillUnmount();
    });
    return instance;
  }

  window.DCLogic = DCLogic;
  window.DCLite = { mount: mount };
})();
