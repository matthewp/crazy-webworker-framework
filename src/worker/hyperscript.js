import { isFunction } from '../util.js';
import signal from './signal.js';
import { createTree, isTree } from './tree.js';

function Fragment(attrs, children) {
  let child;
  let tree = createTree();
  for(let i = 0; i < children.length; i++) {
    child = children[i];
    tree.push.apply(tree, child);
  }
  return tree;
}

function h(tag, attrs, children){
  let argsLen = arguments.length;
  let childrenType = typeof children;
  if(argsLen === 2) {
    if(typeof attrs !== 'object' || Array.isArray(attrs)) {
      children = attrs;
      attrs = null;
    }
  } else if(argsLen > 3 || isTree(children) || isPrimitive(childrenType)) {
    children = Array.prototype.slice.call(arguments, 2);
  }

  let isFn = isFunction(tag);

  if(isFn) {
    let localName = tag.prototype.localName;
    if(localName) {
      return h(localName, attrs, children);
    }

    return tag(attrs || {}, children);
  }

  let tree = createTree();
  let uniq, evs;
  if(attrs) {
    attrs = Object.keys(attrs).reduce(function(acc, key){
      let value = attrs[key];

      let eventInfo = signal(tag, key, value, attrs)
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

  let open = [1, tag, uniq];
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
};

h.frag = Fragment;

function isPrimitive(type) {
  return type === 'string' || type === 'number' || type === 'boolean';
}

export {
  Fragment,
  h as default
};