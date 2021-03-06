/****************************\
 ============================
 
      GAME EDITOR MODULE

 ============================              
\****************************/

const electron = require('electron');
const path = require('path');
const fs = require('fs');
const {ipcRenderer} = electron;
const dialog = electron.remote.dialog;
const remote = require('electron').remote;


/****************************\
 ============================
 
       GUI MANIPULATION

 ============================              
\****************************/

// style pieces
function stylePieces() {
  if (config.pieceTheme.includes('graphic')) {
    config.pieceTheme = '../libs/xiangqiboardjs-0.3.3/img/xiangqipieces/traditional/{piece}.png';
    document.getElementById('pieceStyle').src = '../libs/xiangqiboardjs-0.3.3/img/xiangqipieces/graphic/bK.svg';
  } else {
    config.pieceTheme = '../libs/xiangqiboardjs-0.3.3/img/xiangqipieces/graphic/{piece}.png';
    document.getElementById('pieceStyle').src = '../libs/xiangqiboardjs-0.3.3/img/xiangqipieces/traditional/bK.svg';
  }
  
  board = Xiangqiboard('xiangqiboard', config);
  updateGUIboard('Prev');
  updateGUIboard('Next');
}

// highlight move in move list
function highlightMove(move) {
  // reset highlighting
  document.getElementById('movelist').childNodes.forEach((item, index) => {
    try {
      if (index > 1) {
        item.classList.remove('bg-primary');
        item.classList.remove('text-white');
      }
    } catch(e) {}
  });

  // highlight move
  highlight = document.getElementById('UBB_move_' + move);
  highlight.classList.add('bg-primary');
  highlight.classList.add('text-white');
}

// highlight variation
function highlightVariation(variation) {
  // reset highlighting
  document.getElementById('variationlist').childNodes.forEach((item, index) => {
    try {
      if (index > 1) {
        item.classList.remove('bg-primary');
        item.classList.remove('text-white');
      }
    } catch(e) {}
  });

  // highlight move
  highlight = document.getElementById(variation);
  highlight.classList.add('bg-primary');
  highlight.classList.add('text-white');
}

// update board
function updateGUIboard(moveNumber, variationId) {
  if (moveNumber) {
    // update UBB board
    gotonum(moveNumber);
  } else {
    // parse agrs
    let args = variationId.toString().split('get_movetext(')[1].split(')')[0].split(',');
    
    // update UBB board
    get_movetext(args[0].split("'").join(''), args[1].split("'").join(''));
  }
  
  // get moves
  let currentMove = document.getElementById('shownow').value.split('/')[0];
  let lastMove = document.getElementById('shownow').value.split('/')[1];
  
  // get current FEN
  let UBBfen = getFENTEXT(P[currentMove]);
  
  // update engine board
  engine.setBoard(UBBfen);
  
  // update GUI board
  board.position(UBBfen);
  
  if (isGameOver() == 0)
    ipcRenderer.send('guifen', engine.generateFen());
  
  // current move to highlight
  updateGameTree();
  
  // play sound
  MOVE_SOUND.play()
  
  // highlight last move
  document.querySelectorAll('.square-2b8ce').forEach(function(item) {
    item.classList.remove('highlight');
  });
}

// edit comment
function editComment() {
  if (document.getElementById('comments').value == '') {
    alert('Write a comment first');
    return;
  }
  
  document.getElementById('c_text').value = document.getElementById('comments').value;
  EditComment(cText);
  alert('Comment has been saved');
}

// delete move/moves/variation
function deleteMove() {
  // delete on UBB board
  DelMove();
  clickYES();
  
  // click 'Yes' on delete error message
  setTimeout(() => {
    clickYES();
  }, 100);

  // get moves
  let currentMove = document.getElementById('shownow').value.split('/')[0];
  let lastMove = document.getElementById('shownow').value.split('/')[1];
  
  // get current FEN
  let UBBfen = getFENTEXT(P[currentMove]);
  
  // update engine board
  engine.setBoard(UBBfen);
  
  // update GUI board
  board.position(UBBfen);
  
  if (isGameOver() == 0)
    ipcRenderer.send('guifen', engine.generateFen());
  
  // current move to highlight
  updateGameTree();
}


/****************************\
 ============================
 
       DPXQ INTEGRATION
  
 ============================              
\****************************/

// add variation
function updateGameTree() {
  // reset move list
  let moveList = document.getElementById('movelist');
  moveList.innerHTML = `
    <li class="btn list-group-item bg-light m-0 p-0" style="font-size: 16px; font-weight: bold;">Moves</li>
    <li id="UBB_move_0" class="btn list-group-item list-group-item-action text-center m-0 p-0" onclick="updateGUIboard('First')">Start</li>
  `;
  
  // update move list
  document.getElementById('m_text').childNodes.forEach((item) => {
    if (item.tagName == 'DIV') {
      let moveNumber = parseInt(item.id.split('_')[1]);
      
      if (moveNumber) {
        let moveText = item.childNodes[1].parentNode.innerText;
        let moveItem = document.createElement('li');
        
        moveItem.id = 'UBB_move_' + moveNumber;
        moveItem.classList = 'btn list-group-item list-group-item-action m-0 p-0';
        moveItem.style = 'font-size: 16px';
        moveItem.textContent = moveText;
        moveItem.setAttribute('onclick', 'updateGUIboard(parseInt(this.id.split("move_")[1]))');
        moveList.appendChild(moveItem);
      }
      
      if (item.style.backgroundColor == 'rgb(49, 106, 197)') highlightMove(moveNumber);
    }
  });
  
  // reset variation list
  let variationList = document.getElementById('variationlist');
  variationList.innerHTML = '<li class="btn list-group-item bg-light m-0 p-0" style="font-size: 16px; font-weight: bold;">Variations</li>';
  
  // update variation list
  document.getElementById('v_text').childNodes.forEach((item) => {
    if (item.tagName == 'DIV') {
      let variationNumber = parseInt(item.id.split('_')[1]);
      let variationText = item.childNodes[1].innerText;
      let variationItem = document.createElement('li');
      let clickVariation = item.onclick.toString();
      
      variationItem.id = 'UBB_variation(' + item.id + ')';
      variationItem.classList = 'btn list-group-item list-group-item-action m-0 p-0';
      variationItem.style = 'font-size: 16px';
      variationItem.textContent = variationText;
      variationItem.setAttribute('onclick', 'updateGUIboard(0, ' + clickVariation + ');');
      variationList.appendChild(variationItem);
      
      if (item.style.backgroundColor == 'rgb(49, 106, 197)') highlightVariation(variationItem.id);
    }
  });
  
  // update comments
  document.getElementById('comments').value = document.getElementById('c_text').value.trim();
}

// update DPXQ board
function updateUBB(source, target) {
  let sourceFile = source[0].charCodeAt() - 'a'.charCodeAt();
  let sourceRank = 9 - parseInt(source[1]);
  let targetFile = target[0].charCodeAt() - 'a'.charCodeAt();
  let targetRank = 9 - parseInt(target[1]);
  let ubbSource = sourceFile.toString() +  sourceRank.toString();
  let ubbTarget = targetFile.toString() + targetRank.toString();

  // make move on UBB board
  getMove(ubbSource);
  getMove(ubbTarget);
  
  // add variation (optional)
  if (document.getElementById('v_addnew').childNodes.length)
    if (document.getElementById('v_addnew').scrollWidth)
      document.getElementById('v_addnew').querySelector('a').click();
  
  // add move to move list
  setTimeout(() => { updateGameTree(); }, 0);
}

// export UBB game to clipboard
function copyUbb() {
  copyUBB();
  setTimeout(() => { clickYES(); }, 0);
}


/****************************\
 ============================
 
         MOVE PIECES
  
 ============================              
\****************************/

// check for game state
function isGameOver() {
  if (engine.generateLegalMoves().length == 0) {
    gameResult = (engine.getSide() ? 'Red wins' : 'Black wins');
    return 1;
  }

  if (engine.generateLegalMoves().length == 0) {
    gameResult = (engine.getSide() ? 'Black wins' : 'Red wins');
    return 1;
  }
  
  return 0;
}

// highlight legal moves
function highlightLegalMoves(sourceSquare) {
  let legalMoves = engine.generateLegalMoves();
  
  for (let index = 0; index < legalMoves.length; index++) {
    let move = legalMoves[index].move;
    let source = engine.squareToString(engine.getSourceSquare(move));
    let target = engine.squareToString(engine.getTargetSquare(move));
    
    if (source == sourceSquare) {
      document.querySelector('.square-' + target).classList.add('legalmove');
      
      if (engine.getPiece(engine.getTargetSquare(move)))
        document.querySelector('.square-' + target).classList.add('legalcapture');
    }
  }
}

// move piece
function movePiece (source, target) {
  // remove all previous highlights
  document.querySelectorAll('.square-2b8ce').forEach(function(item) {
    item.classList.remove('highlight');
    item.classList.remove('legalmove');
    item.classList.remove('legalcapture');
  });
  
  let move = source + target;
  let validMove = engine.moveFromString(move);

  // invalid move
  if (validMove == 0) return 'snapback';
  
  let legalMoves = engine.generateLegalMoves();
  let isLegal = 0;
  
  for (let count = 0; count < legalMoves.length; count++) {
    if (validMove == legalMoves[count].move) isLegal = 1;  
  }
  
  // invalid move
  if (isLegal == 0) return 'snapback';
  
  // make move on engine's board
  engine.makeMove(validMove);
  
  // sync with DPXQ board
  updateUBB(source, target);
  
  // play sound
  if (validMove) playSound(validMove);
  
  // highlight last move
  setTimeout(function() {
    document.querySelector('.square-' + target).classList.add('highlight');
  }, 150);
  
  // check game state
  if (isGameOver()) document.title += ' (' + gameResult + ')';
}

// update the board position after the piece snap
function onSnapEnd () {
  board.position(engine.generateFen());
  
  if (isGameOver() == 0)
    ipcRenderer.send('guifen', engine.generateFen());
}


/****************************\
 ============================
 
         BOARD SOUNDS

 ============================              
\****************************/

// import sounds
const MOVE_SOUND = new Audio('../libs/xiangqiboardjs-0.3.3/sounds/move.wav');
const CAPTURE_SOUND = new Audio('../libs/xiangqiboardjs-0.3.3/sounds/capture.wav');

// play sound
function playSound(move) {
  if (engine.getCaptureFlag(move)) CAPTURE_SOUND.play();
  else MOVE_SOUND.play();
}


/****************************\
 ============================
 
     ELECTRON INTERACTION

 ============================              
\****************************/

// listen to new game menu click
ipcRenderer.on('newgame', function(e) {
  newGame();
});

// listen to opem game menu click
ipcRenderer.on('opengame', function(e) {
  loadUbb();
});

// listen to opem game menu click
ipcRenderer.on('savegame', function(e) {
  saveUbb();
});

// listen to toggle move list menu click
ipcRenderer.on('movelist', function(e) {
  let size = remote.getCurrentWindow().webContents.getOwnerBrowserWindow().getBounds()['width'];
  
  remote.getCurrentWindow().setBounds({
    x: remote.getCurrentWindow().getPosition()[0],
    y: remote.getCurrentWindow().getPosition()[1],
    width: (size == 844 ? 447 : 844),
    height: 564
  });

});

// listen to best move
ipcRenderer.on('bestmove', function(e, bestMove) {
  movePiece(bestMove[0] + bestMove[1], bestMove[2] + bestMove[3], 0);
  setTimeout(function() {
    updateGUIboard(document.getElementById('shownow').value.split('/')[0]);
    
    // highlight last move
    document.querySelectorAll('.square-2b8ce').forEach(function(item) {
      item.classList.remove('highlight');
    });
    document.querySelector('.square-' + bestMove[2] + bestMove[3]).classList.add('highlight');
  }, 0);
});

// new game
function newGame() {
  UBB = '';
  initdata();
  updateGUIboard('First');
  document.title = 'CCBridge Arena';
}

// load UBB game from file
function loadUbb() {
  dialog.showOpenDialog({ 
      title: 'Open UBB game', 
      defaultPath: path.join(__dirname, '../game.ubb'), 
      buttonLabel: 'Open', 
      filters: [ 
          { 
              name: 'UBB games', 
              extensions: ['ubb', 'txt'] 
          }, ], 
      properties: [] 
  }).then((file) => {
    if (!file.canceled) {
      fs.readFile(file.filePaths[0], 'utf-8', (err, data) => {
          if(err){
              alert('An error ocurred reading the file :' + err.message);
              return;
          }

          // load game
          try {
            document.title = data.split('[DhtmlXQ_title]')[1].split('[/DhtmlXQ_title]')[0]
          } catch(e) { alert('Game title is undefined'); }
          UBB = data;
          initdata();
          updateGUIboard('First');
          
          // restore view
          window.scrollTo(0, 0);
      });
    }
  }).catch(err => {
      alert('Internal error: ' + err);
      console.log(err) 
  });
}

// save game to UBB file
function saveUbb() {
  // copy UBB to clipboard (that's the way provided by DPXQ editor...)
  copyUbb();
  
  // save file
  dialog.showSaveDialog({ 
      title: 'Save UBB game', 
      defaultPath: path.join(__dirname, '../game.ubb'), 
      buttonLabel: 'Save', 
      filters: [ 
          { 
              name: 'UBB games', 
              extensions: ['ubb', 'txt'] 
          }, ], 
      properties: [] 
  }).then(file => { 
      // Stating whether dialog operation was cancelled or not. 
      console.log(file.canceled); 
      if (!file.canceled) { 
          console.log(file.filePath.toString()); 
            
          // Creating and Writing to the sample.txt file 
          fs.writeFile(file.filePath.toString(),  
                       electron.clipboard.readText(), function (err) { 
              if (err) throw err;
          }); 
      } 
  }).catch(err => { 
      console.log(err) 
  });
  
  // restore view
  window.scrollTo(0, 0);
}


/****************************\
 ============================
 
         MAIN DRIVER

 ============================              
\****************************/

var gameResult = '';

// chess board configuration
var config = {
  draggable: true,
  pieceTheme: '../libs/xiangqiboardjs-0.3.3/img/xiangqipieces/traditional/{piece}.png',
  position: 'start',
  moveSpeed: 50,
  snapbackSpeed: 50,
  snapSpeed: 50,
  onDragStart: highlightLegalMoves,
  onDrop: movePiece,
  onSnapEnd: onSnapEnd
};

// create chess board widget instance
var board = Xiangqiboard('xiangqiboard', config);

// create WukongJS engine instance
const engine = new Engine();

// init starting position
engine.setBoard(engine.START_FEN);








