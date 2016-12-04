function App(contents) {
  return h('html', [
    h('head', [
      h('style',`
          p {
          font: 12px/16px Arial;
          margin: 10px 10px 15px;
        }
        button {
          font: bold 14px/14px Arial;
          margin-left: 10px;
        }
        #grid {
          margin: 10px;
        }
        #timing {
          clear: both;
          padding-top: 10px;
        }
        .box-view {
          width: 20px; height: 20px;
          float: left;
          position: relative;
          margin: 8px;
        }
        .box {
          border-radius: 100px;
          width: 20px; height: 10px;
          padding: 5px 0;
          color: #fff;
          font: 10px/10px Arial;
          text-align: center;
          position: absolute;
        }`)
    ]),
    h('body', [
      h('div', {id: 'timing'}),
      contents
    ])
  ]);
}
