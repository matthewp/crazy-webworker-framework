(function () {
'use strict';

function getInstance(fritz, id){
  return fritz._instances[id];
}

function setInstance(fritz, id, instance){
  fritz._instances[id] = instance;
}

function delInstance(fritz, id){
  delete fritz._instances[id];
}

function isFunction(val) {
  return typeof val === 'function';
}

const defer = Promise.resolve().then.bind(Promise.resolve());

const sym = typeof Symbol === 'function' ? Symbol : function(v) { return '_' + v };

const DEFINE = 'define';
const TRIGGER = 'trigger';
const RENDER = 'render';
const EVENT = 'event';
const STATE = 'state';
const DESTROY = 'destroy';
const RENDERED = 'rendered';
const CLEANUP = 'cleanup';
const REGISTER = 'register';

let currentInstance = null;

function renderInstance(instance) {
  currentInstance = instance;
  let tree = instance.render(instance.props, instance.state);
  currentInstance = null;
  return tree;
}

let queue = [];

function enqueueRender(instance, sentProps) {
  if(!instance._dirty && (instance._dirty = true) && queue.push([instance, sentProps])==1) {
    defer(rerender);
  }
}

function rerender() {
	let p, list = queue;
	queue = [];
	while ( (p = list.pop()) ) {
		if (p[0]._dirty) render(p[0], p[1]);
	}
}

function render(instance, sentProps) {
  if(sentProps) {
    var nextProps = Object.assign({}, instance.props, sentProps);
    instance.componentWillReceiveProps(nextProps);
    instance.props = nextProps;
  }

  if(instance.shouldComponentUpdate(nextProps) !== false) {
    instance.componentWillUpdate();
    instance._dirty = false;

    postMessage({
      type: RENDER,
      id: instance._fritzId,
      tree: renderInstance(instance)
    });
  }
}

class Component {
  constructor() {
    this.state = {};
    this.props = {};
  }

  dispatch(ev) {
    let id = this._fritzId;
    postMessage({
      type: TRIGGER,
      event: ev,
      id: id
    });
  }

  setState(state) {
    let s = this.state;
    Object.assign(s, isFunction(state) ? state(s, this.props) : state);
    enqueueRender(this);
  }

  // Force an update, will change to setState()
  update() {
    console.warn('update() is deprecated. Use setState() instead.');
    this.setState({});
  }

  componentWillReceiveProps(){}
  shouldComponentUpdate() {
    return true;
  }
  componentWillUpdate(){}
  componentWillUnmount(){}
}

let Store;
let Handle;

Store = class {
  constructor() {
    this.handleMap = new WeakMap();
    this.idMap = new Map();
    this.id = 0;
    this.inUse = true;
  }

  from(fn) {
    let handle;
    let id = this.handleMap.get(fn);
    if(id == null) {
      id = this.id++;
      handle = new Handle(id, fn);
      this.handleMap.set(fn, id);
      this.idMap.set(id, handle);
    } else {
      handle = this.idMap.get(id);
    }
    return handle;
  }

  get(id) {
    return this.idMap.get(id);
  }
};

Handle = class {
  static get store() {
    if(!this._store) {
      this._store = new Store();
    }
    return this._store;
  }

  static from(fn) {
    return this.store.from(fn);
  }

  static get(id) {
    return this.store.get(id);
  }

  constructor(id, fn) {
    this.id = id;
    this.fn = fn;
  }

  del() {
    let store = Handle.store;
    store.handleMap.delete(this.fn);
    store.idMap.delete(this.id);
  }
};

var Handle$1 = Handle;

const eventAttrExp = /^on[A-Z]/;

function signal(tagName, attrName, attrValue, attrs) {
  if(eventAttrExp.test(attrName)) {
    let eventName = attrName.toLowerCase();
    let handle = Handle$1.from(attrValue);
    handle.inUse = true;
    currentInstance._fritzHandles.set(handle.id, handle);
    return [1, eventName, handle.id];
  }
}

const _tree = sym('ftree');

function isTree(obj) {
  return !!(obj && obj[_tree]);
}

function createTree() {
  var out = [];
  out[_tree] = true;
  return out;
}

function Fragment(attrs, children) {
  var child;
  var tree = createTree();
  for(var i = 0; i < children.length; i++) {
    child = children[i];
    tree.push.apply(tree, child);
  }
  return tree;
}

function h(tag, attrs, children){
  var argsLen = arguments.length;
  var childrenType = typeof children;
  if(argsLen === 2) {
    if(typeof attrs !== 'object' || Array.isArray(attrs)) {
      children = attrs;
      attrs = null;
    }
  } else if(argsLen > 3 || isTree(children) || isPrimitive(childrenType)) {
    children = Array.prototype.slice.call(arguments, 2);
  }

  var isFn = isFunction(tag);

  if(isFn) {
    var localName = tag.prototype.localName;
    if(localName) {
      return h(localName, attrs, children);
    }

    return tag(attrs || {}, children);
  }

  var tree = createTree();
  var uniq;
  if(attrs) {
    var evs;
    attrs = Object.keys(attrs).reduce(function(acc, key){
      var value = attrs[key];

      var eventInfo = signal(tag, key, value, attrs);
      if(eventInfo) {
        if(!evs) evs = [];
        evs.push(eventInfo);
      } else if(key === 'key') {
        uniq = value;
      } else {
        acc.push(key);
        acc.push(value);
      }

      return acc;
    }, []);
  }

  var open = [1, tag, uniq];
  if(attrs) {
    open.push(attrs);
  }
  if(evs) {
    open.push(evs);
  }
  tree.push(open);

  if(children) {
    children.forEach(function(child){
      if(typeof child !== 'undefined' && !Array.isArray(child)) {
        tree.push([4, child + '']);
        return;
      }

      while(child && child.length) {
        tree.push(child.shift());
      }
    });
  }

  tree.push([2, tag]);

  return tree;
}

h.frag = Fragment;

function isPrimitive(type) {
  return type === 'string' || type === 'number' || type === 'boolean';
}

const templateTag = 0;
const valueTag = 1;

const templates = new WeakMap();
const _template = Symbol();
let globalId = 0;


var html = function(strings, ...args) {
  let id;
  if(templates.has(strings)) {
    id = templates.get(strings);
  } else {
    globalId = globalId + 1;
    id = globalId;
    templates.set(strings, id);
    register(id, strings);
  }

  // Set values
  let vals = args.map(arg => {
    let type = typeof arg;
    if(type === 'function') {
      let handle = Handle$1.from(arg);
      handle.inUse = true;
      currentInstance._fritzHandles.set(handle.id, handle);
      return Uint8Array.from([0, handle.id]);
    } else if (Array.isArray(arg)) {
      let tag;
      if(isTemplate(arg)) {
        tag = templateTag;
      } else {
        tag = valueTag;
      }
      return [tag, arg];
    }
    return arg;
  });

  return mark([1, id, 2, vals]);
};

function register(id, template) {
  postMessage({
    type: REGISTER,
    id,
    template
  });
}

function mark(template) {
  template[_template] = true;
  return template;
}

function isTemplate(template) {
  return !!template[_template];
}

function render$1(fritz, msg) {
  let id = msg.id;
  let props = msg.props || {};

  let instance = getInstance(fritz, id);
  if(!instance) {
    let constructor = fritz._tags[msg.tag];
    instance = new constructor();
    Object.defineProperties(instance, {
      _fritzId: {
        enumerable: false,
        value: id
      },
      _fritzHandles: {
        enumerable: false,
        writable: true,
        value: new Map()
      }
    });
    setInstance(fritz, id, instance);
  }

  enqueueRender(instance, props);
}

function trigger(fritz, msg){
  let inst = getInstance(fritz, msg.id);
  let response = Object.create(null);

  let method;
  if(msg.handle != null) {
    method = Handle$1.get(msg.handle).fn;
  } else {
    let name = msg.event.type;
    let methodName = 'on' + name[0].toUpperCase() + name.substr(1);
    method = inst[methodName];
  }

  if(method) {
    let event = msg.event;
    method.call(inst, event);

    enqueueRender(inst);
  } else {
    // TODO warn?
  }
}

function destroy(fritz, msg){
  let instance = getInstance(fritz, msg.id);
  instance.componentWillUnmount();

  let handles = instance._fritzHandles;
  handles.forEach(function(handle){
    handle.del();
  });
  handles.clear();
  
  delInstance(fritz, msg.id);
}

function rendered(fritz, msg) {
  let instance = getInstance(fritz, msg.id);
  instance.componentDidMount();
}

function cleanup(fritz, msg) {
  let instance = getInstance(fritz, msg.id);
  let handles = instance._fritzHandles;
  msg.handles.forEach(function(id){
    let handle = handles.get(id);
    handle.del();
    handles.delete(id);
  });
}

let hasListened = false;

function relay(fritz) {
  if(!hasListened) {
    hasListened = true;

    self.addEventListener('message', function(ev){
      let msg = ev.data;
      switch(msg.type) {
        case RENDER:
          render$1(fritz, msg);
          break;
        case EVENT:
          trigger(fritz, msg);
          break;
        case STATE:
          fritz.state = msg.state;
          break;
        case DESTROY:
          destroy(fritz, msg);
          break;
        case RENDERED:
          rendered(fritz, msg);
          break;
        case CLEANUP:
          cleanup(fritz, msg);
          break;
      }
    });
  }
}

const fritz = Object.create(null);
fritz.Component = Component;
fritz.define = define;
fritz.h = h;
fritz.html = html;
fritz._tags = Object.create(null);
fritz._instances = Object.create(null);

function define(tag, constructor) {
  if(constructor === undefined) {
    throw new Error('fritz.define expects 2 arguments');
  }
  if(constructor.prototype === undefined ||
    constructor.prototype.render === undefined) {
    let render = constructor;
    constructor = class extends Component{};
    constructor.prototype.render = render;
  }

  fritz._tags[tag] = constructor;

  Object.defineProperty(constructor.prototype, 'localName', {
    enumerable: false,
    value: tag
  });

  relay(fritz);

  postMessage({
    type: DEFINE,
    tag: tag,
    props: constructor.props,
    events: constructor.events,
    features: {
      mount: !!constructor.prototype.componentDidMount
    }
  });
}

let state;
Object.defineProperty(fritz, 'state', {
  set: function(val) { state = val; },
  get: function() { return state; }
});

var styles = ".about {\n  background-color: var(--alt-bg);\n  max-width: 80%;\n  margin: auto;\n  font-size: 120%;\n}\n\n.about p, .about ul {\n  line-height: 2rem;\n}\n\n.about h1 {\n  color: var(--vermilion);\n  font-size: 220%;\n}\n\n.about a, .about a:visited {\n  color: var(--main-color);\n}\n\n.about code-snippet,\n.about code-file {\n  width: 60%;\n}\n\n.about code-file {\n  --box-shadow: none;\n}\n\n@media only screen and (max-width: 768px) {\n  .about code-snippet,\n  .about code-file {\n    width: 100%;\n    font-size: 90%;\n  }\n}";

const npmInstall = `
npm install fritz --save
`;

const yarnAdd = `
yarn add fritz
`;

function about() {
  return html`
    <section class="about">
      <style>${styles}</style>
      <h1 id="what-is-fritz">What is Fritz?</h1>
      <p><strong>Fritz</strong> is a UI library that allows you to define <em>components</em> that run inside of a <a href="https://www.w3.org/TR/workers/">Web Worker</a>. By running your application logic inside of a Worker, you can ensure that the main thread and scrolling are never blocked by expensive work you are doing. Fritz makes jank-free apps possible.</p>

      <p>Fritz plays nicely with frameworks. Since it is built on web components you can use Fritz just by adding a tag. Use Fritz within your <a href="https://facebook.github.io/react/">React</a>, <a href="https://vuejs.org/">Vue.js</a>, <a href="https://angular.io/">Angular</a>, or any other framework. If you have an expensive component that operates on a large dataset, this is a good candidate to turn into a Fritz component. Although you can create your entire app using Fritz (this page is), you don't have to.</p>

      <p>If you've heard of React's new version, <strong>Fiber</strong>, Fritz is in some ways an alternative. Fiber enables React to smartly schedule updates. Fritz allows for <em>parallel</em> updates. You're app can launch as many workers as you want and Fritz will use them all. The main thread only ever needs to apply changes. Due to this design, Fritz's scheduler is dead simple; it only needs to ensure that it applies only 16ms of work per frame. It can completely ignore the cost of user-code; that's free with Fritz.</p>

      <h1>Getting Started</h1>
      <h2>Installation</h2>

      <p>Install Fritz with npm:</p>
      <code-snippet .code=${npmInstall}></code-snippet>

      <p>Or with Yarn:</p>
      <code-snippet .code=${yarnAdd}></code-snippet>

      <h2>Using Fritz</h2>
      <p>Fritz lets you define <a href="https://www.webcomponents.org/introduction">web components</a> inside of a Web Worker. So, the first step to using Fritz is to create a Worker. Use <code>new Worker</code> to do so:</p>

      <code-snippet .code=${`const worker = new Worker('./app.js');`}></code-snippet>

      <p>And then define a component inside of that worker. We'll assume you know how to configure your bundler tool and skip that part.</p>

      <p>Then import all of the needed things and create a basic component:</p>

      <code-file name="app.js" .code=${`
import fritz, { Component, html } from 'fritz';

class Hello extends Component {
  static get props() {
    return {
      name: { attribute: true }
    };
  }

  render({name}) {
    return html\`<div>Hello \${name}!</div>\`;
  }
}

fritz.define('hello-message', Hello);
`}></code-file>

      <p>Cool, now that we have created a component we need to actually use it. Create another module named main.js, this will be a script we add to our page which will sync up the DOM to our component:</p>

      <code-file name="main.js" .code=${`
import fritz from 'https://unpkg.com/fritz/window.js';

const worker = new Worker('./app.js');
fritz.use(worker);
`}></code-file>

      <p>Now we just need to add this script to our page and use the component.</p>

      <code-file name="index.html" .code=${`
<!doctype html>
<html lang="en">
<title>Our app</title>

<hello-message name="World"></hello-message>

<script type="module" src="./main.js"></script>
`}></code-file>

      <p>And that's it!</p>

      <h2>In a React app</h2>
      <p>Using Fritz components within a <a href="https://facebook.github.io/react/">React</a> application is simple. First step is to update your <code>.babelrc</code> to use h as the pragma:</p>
      <code-snippet .code=${`
{
  "plugins": [
    ["transform-react-jsx", { "pragma":"h" }]
  ]
}
`}></code-snippet>

      <p>This will allow you to transform JSX for the React side of your application. As before, we won't explain how to configure your bundler, but know that you will need to create a worker bundle (that contains Fritz code) and a bundle for your React code.</p>

      <p>React doesn't properly handle passing data to web components, but luckily there is a helper library that fixes the issue for us. Install <a href="https://github.com/skatejs/val">skatejs/val</a> like so:</p>
      <code-snippet .code=${'npm install @skatejs/val'}></code-snippet>

      <p>Then create the module that will act as our wrapper:</p>

      <code-file name="val.js" .code=${`
import React from 'react';
import val from '@skatejs/val';

export default val(React.createElement);
`}></code-file>

      <p>And within your React code, use it:</p>


      <code-file name="app.js" .code=${`
import React from 'react';
import ReactDOM from 'react-dom';
import fritz from 'fritz/window';
import h from './val.js';

fritz.use(new Worker('/worker.js'));

class Home extends React.Component {
  render() {
    return <div>
      <span>Hello world</span>
      <worker-component name={"Wilbur"}></worker-component>
    </div>
  }
}

const main = document.querySelector('main');
ReactDOM.render(<Home/>, main);
`}></code-file>
      <p>Note that this imports our implementation of <code>h</code>, which is just a small wrapper around <code>React.createElement</code>.</p>

      <p>Now we just need to implement <code>&lt;worker-component&gt;</code>.</p>

      <code-file name="app.js" .code=${`
import fritz, { Component, h } from 'fritz';

class MyWorkerComponent extends Component {
  static get props() {
    return {
      name: {}
    };
  }

  constructor() {
    super();
    this.state = { count: 0 };
  }

  add() {
    const count = this.state.count + 1;
    this.setState({count});
  }

  render({name}, {count}) {
    return html\`
      <section>
        <div>Hi \${name}. This has been clicked \${count} times.</div>
        <a href="#" on-click=\${this.add}>Add</a>
      </section>
    \`;
  }
}

fritz.define('worker-component', MyWorkerComponent);
`}></code-file>

      <p>A few things worth noting here:</p>
      <ul>
        <li>We define <strong>props</strong> that we expect to receive with a static <code>props</code> getter (of course you can use class properties here if using the Babel plugin).</li>
        <li><code>render</code> receives props and state as its arguments, so you can destruct.</li>
        <li>Unlike in React and Preact, you can directly pass your class methods as event handlers. Fritz will know to call your component as the <code>this</code> value when calling that function.</li>
        <li>As always, we finish out component by calling <code>fritz.define</code> to define the custom element tag name.</li>
      </ul>

      <p>And that's it! Now you can seemlessly use any Fritz components within your React application.</p>
    </section>
  `;
}

var styles$1 = ":host {\n  display: block;\n  --main-bg: var(--cadetblue);\n  --alt-bg: var(--gray);\n\n  --main-color: var(--jet);\n  --alt-color: #fff;\n}\n\na, a:visited {\n  font-weight: 600;\n}\n\n.shadow-section {\n  box-shadow: 0px 1px 10px 1px rgba(0,0,0,0.3);\n  margin-bottom: 12px;\n}\n\n.intro, .about {\n  padding: 2.7777777777777777rem 2.2222222222222223rem 1.6666666666666667rem 2.2222222222222223rem;\n}\n\n/* intro */\n.intro {\n  text-align: center;\n  background-color: var(--main-bg);\n  color: var(--main-color);\n}\n\n.primary-title {\n  font-size: 2.2em;\n}\n\n.fritz-flame {\n  width: 14rem;\n  border-radius: 0.8rem;\n}\n\n.github {\n  display: inline-block;\n  text-align: center;\n  width: 11rem;\n  padding: 0.5rem 0;\n  margin: 0.5rem 1rem;\n  font-size: 150%;\n  font-weight: 100;\n}\n\n.github, .github:visited {\n  color: #fff;\n  background-color: var(--vermilion);\n  text-decoration: none;\n}\n\n.intro code-file {\n  display: block;\n  width: 60%;\n  margin: auto;\n  text-align: initial;\n  font-size: 130%;\n}\n\ncode-file:nth-of-type(1) {\n  margin-top: 4rem;\n}\n\ncode-snippet, code-file {\n  display: block;\n}\n\n@media only screen and (max-width: 768px) {\n  .intro code-file {\n    width: 100%;\n    font-size: 90%;\n  }\n}\n/* end intro */\n\nfooter {\n  background-color: var(--main-bg);\n  height: 7rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  color: #fff;\n  font-size: 120%;\n}\n\nfooter p {\n  margin: 0;\n}\n\nfooter a,\nfooter a:visited {\n  color: #fff;\n  font-weight: 600;\n}\n";

var styles$2 = ".title {\n  text-align: center;\n  font-weight: 100;\n}\n\ncode-snippet {\n  display: block;\n  box-shadow: var(--box-shadow, 3px 3px 12px 1px rgba(0,0,0,0.4));\n}";

class CodeFile extends Component {
  static get props() {
    return {
      code: 'string',
      name: { type: 'string', attribute: true }
    }
  }

  render({code, name}) {
    
    return html`
      <div>
        <style>${styles$2}</style>
        <div class="title">${name}</div>
        <code-snippet .code=${code}></code-snippet>
      </div>
    `;
  }
}

fritz.define('code-file', CodeFile);

// https://coolors.co/bac1b8-58a4b0-303030-0c7c59-d64933

const jsCode = `
class HelloMessage extends Component {
  static props = {
    name: { attribute: true }
  }

  render({name}) {
    return html\`
      <div>Hello \${name}!</div>
    \`;
  }
}

fritz.define('hello-message', HelloMessage);
`;

const htmlCode = `
<hello-message name="World"></hello-message>

<script type="module">
  import fritz from 'https://unpkg.com/fritz/window.js';

  fritz.use(new Worker('./worker.js'));
</script>
`;

function main() {
  return html`
    <main>  
      <style>${styles$1}</style>

      <section class="intro shadow-section">
        <header class="title">
          <h1 class="primary-title">Fritz</h1>
          <picture>
            <source srcset="./frankenstein-fritz-flame.webp" type="image/webp"/>
            <source srcset="./frankenstein-fritz-flame.png" type="image/jpeg"/>
            <img src="./frankenstein-fritz-flame.png" class="fritz-flame" title="Fritz, with a flame"/>
          </picture>
          <h2>Take your UI off the main thread.</h2>
        </header>

        <a class="github" href="https://github.com/matthewp/fritz">GitHub</a>

        <code-file name="worker.js" .code=${jsCode}></code-file>
        <code-file name="index.html" .code=${htmlCode}></code-file>
      </section>

      ${about()}

      <footer>
        <p>Made with 🎃 by <a href="https://twitter.com/matthewcp">@matthewcp</a></p>
      </footer>
    </main>
  `;
}

fritz.define('its-fritz-yall', main);

}());
