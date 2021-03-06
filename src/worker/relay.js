import { render, trigger, destroy, rendered, cleanup } from './lifecycle.js';
import { RENDER, EVENT, STATE, DESTROY, RENDERED, CLEANUP } from '../message-types.js';
import { addEventListener } from './env.js';

let hasListened = false;

export default function relay(fritz) {
  if(!hasListened) {
    hasListened = true;

    addEventListener('message', function(ev){
      let msg = ev.data;
      switch(msg.type) {
        case RENDER:
          render(fritz, msg);
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
};
