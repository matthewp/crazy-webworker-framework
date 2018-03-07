import { RENDER } from '../message-types.js';
import { defer } from '../util.js';
import { diff } from './diff/diff.js';
import { startPatch, stopPatch } from './patch.js';

export let currentInstance = null;

export function renderInstance(instance) {
  currentInstance = instance;
  let tree = instance.render(instance.props, instance.state);
  currentInstance = null;
  return tree;
};

let queue = [];

export function enqueueRender(instance, sentProps) {
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

    // Diffing
    let vnode = renderInstance(instance);
    currentInstance = instance;
    startPatch(instance._vnode);
    currentInstance = null;
    instance._vnode = vnode;
    let changeList = stopPatch();

    postMessage({
      type: RENDER,
      id: instance._fritzId,
      patches: changeList.valueOf()
    });
  }
}
