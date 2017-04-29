import { render, trigger } from './lifecycle.js';
import { RENDER, EVENT, STATE } from '../message-types.js';

let hasListened = false;

export default function relay(fritz) {
  if(!hasListened) {
    hasListened = true;

    self.addEventListener('message', function(ev){
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
      }
    });
  }
};