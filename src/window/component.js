import { withUpdate } from 'skatejs/dist/esnext/with-update';
import { withRenderer } from 'skatejs/dist/esnext/with-renderer';
import { idomRender as render } from './idom-render.js';
import { withMounting } from './mounting-component.js';
import { EVENT, RENDER } from '../message-types.js';

function postEvent(event, inst, handle) {
  let worker = inst._worker;
  let id = inst._id;
  worker.postMessage({
    type: EVENT,
    event: {
      type: event.type,
      detail: event.detail,
      value: event.target.value
    },
    id: id,
    handle: handle,
  });
}

export function withComponent(Base = HTMLElement) {
  return class extends withMounting(withRenderer(withUpdate(Base))) {
    constructor() {
      super();
      this._handlers = Object.create(null);
    }

    renderer() {
      super.renderer();
      this._worker.postMessage({
        type: RENDER,
        tag: this.localName,
        id: this._id,
        props: this.props
      });
    }

    doRenderCallback(vdom) {
      this.beforeRender();
      let shadowRoot = this.shadowRoot;
      render(vdom, shadowRoot, this);
      this.afterRender();
    }

    addEventCallback(handleId, eventProp) {
      var key = eventProp + '/' + handleId;
      var fn;
      if(fn = this._handlers[key]) {
        return fn;
      }

      // TODO optimize this so functions are reused if possible.
      var self = this;
      fn = function(ev){
        ev.preventDefault();
        postEvent(ev, self, handleId);
      };
      this._handlers[key] = fn;
      return fn;
    }

    addEventProperty(name) {
      var evName = name.substr(2);
      var priv = '_' + name;
      var proto = Object.getPrototypeOf(this);
      Object.defineProperty(proto, name, {
        get: function(){ return this[priv]; },
        set: function(val) {
          var cur;
          if(cur = this[priv]) {
            this.removeEventListener(evName, cur);
          }
          this[priv] = val;
          this.addEventListener(evName, val);
        }
      });
    }

    handleEvent(ev) {
      ev.preventDefault();
      postEvent(ev, this);
    }
  }
}

export const Component = withComponent();
