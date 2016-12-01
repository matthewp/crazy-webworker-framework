(function(){

  class Framework {
    constructor() {
      this._router = null;
      this._started = false;
    }

    get router() {
      return this._router;
    }

    set router(val) {
      this._router = val;
      if(!this.started) {
        this.start();
      }
    }

    start() {
      var initialState = document.documentElement.outerHTML;
      this._router.postMessage({
        type: 'initial',
        state: initialState,
        url: location.pathname
      });

      this._router.addEventListener('message',
        ev => this.handle(ev));
    }

    handle(msg) {
      var ev = msg.data;
      var bc = ev.tree;

      var render = function(){
        var n;
        for(var i = 0, len = bc.length; i < len; i++) {
          n = bc[i];
          switch(n[0]) {
            // Open
            case 1:
              IncrementalDOM.elementOpen(n[1], '', n[2]);
              break;
            case 2:
              IncrementalDOM.elementClose(n[1]);
              break;
            case 4:
              IncrementalDOM.text(n[1]);
              break;
          }
        }
      };

      IncrementalDOM.patch(document.documentElement, render);
    }
  }

  self.framework = new Framework();

})();
