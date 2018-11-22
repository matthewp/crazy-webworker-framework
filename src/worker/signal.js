import { currentInstance } from './instance.js';
import Handle from './handle.js';

const eventAttrExp = /^on[A-Z]/;

function signal(tagName, attrName, attrValue, attrs) {
  if(eventAttrExp.test(attrName)) {
    let eventName = attrName.toLowerCase();
    let handle = Handle.from(attrValue);
    handle.inUse = true;
    currentInstance._fritzHandles.set(handle.id, handle);
    return [1, eventName, handle.id];
  }
}

export default signal;