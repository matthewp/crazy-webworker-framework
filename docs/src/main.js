import fritz from '../../window';
import styles from './agate.css';
import hljs from './hljs.js';

class CodeSnippet extends HTMLElement {
  static get observedAttributes() {
    return ['code', 'lang'];
  }
  
  connectedCallback() {
    if(!this.shadowRoot) {
      let root = this.attachShadow({mode:'open'});
      let doc = this.ownerDocument;

      let style = doc.createElement('style');
      style.textContent = styles;
      root.appendChild(style);

      let pre = doc.createElement('pre');
      pre.append(doc.createElement('code'));
      root.append(pre);
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    this[name] = newVal;
  }

  set lang(val) {
    this._lang = val;
  }

  set code(val) {
    // Remove loading newline
    this._code = val[0] === '\n' ? val.substr(1) : val;
    let tn = this.ownerDocument.createTextNode(this._code);
    let code = this.shadowRoot.querySelector('code');
    let lang = this._lang;
    if(lang) {
      code.classList.add(lang);
    }
    code.append(tn);
    hljs.highlightBlock(code);
  }
}

customElements.define('code-snippet', CodeSnippet);

fritz.use(new Worker('./app.js'));