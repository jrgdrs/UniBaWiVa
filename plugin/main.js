const { entrypoints, host, versions } = require('uxp')
const { app } = require('indesign')
const osInfo = require('os')
//let myDocument = app.documents.item(0) //add();

console.log(
  osInfo.platform(),
  host.name,
  host.version,
  'powered by',
  versions.uxp,
  app.scriptPreferences.version
)

/*
let myGridPreferences = myDocument.gridPreferences;
myGridPreferences.baselineDivision = 14;
myGridPreferences.baselineStart = 70;
myGridPreferences.baselineGridShown = true;

myDocument = app.documents.item(0);
let myPage = app.activeWindow.activePage.allPageItems[0];
//console.log( myPage);

let tsr = app.activeDocument.stories.everyItem();//.textStyleRanges.contents;
 tsr = app.activeDocument.stories.everyItem().lines.everyItem();//.textStyleRanges.everyItem();

console.log( tsr );
*/

var par = getActiveStory()

function getActiveStory () {
  if (app.selection[0] === undefined) {
    return app.activeDocument.stories.firstItem()
  } else {
    return app.selection[0].parentStory
  }
}

// erweitern
const button = document.querySelector('button[id="btnChangeJust"]')
button.addEventListener('click', () => {
  par = getActiveStory()

  var lines = par.lines.length
  var oldDesiredWordSpacing = Number(par.desiredWordSpacing)
  var cDesiredWordSpacing = Number(par.desiredWordSpacing)

  // WordSpacing solange verringern bis eine Zeile weniger
  while (par.lines.length == lines && cDesiredWordSpacing > 65) {
    cDesiredWordSpacing--
    par.desiredWordSpacing = cDesiredWordSpacing
    if (par.lines.length == lines) {
      par.desiredWordSpacing = oldDesiredWordSpacing
    }
    // Das Skript orientiert sich am minimumWordSpacing
    // Wert aus den Blocksatzeinstellungen.
    // Falls der Minimalwert unterschritten wird,
    // wird der Originalwert wieder hergestellt.
    if (par.desiredWordSpacing == par.minimumWordSpacing) {
      par.desiredWordSpacing = oldDesiredWordSpacing
    }
  }
})


//reset
const buttonR = document.querySelector('button[id="btnResetJust"]')
buttonR.addEventListener('click', () => {
  par = getActiveStory()
  par.desiredWordSpacing = 100
  par.setNthDesignAxis(0,300);
})


//uniti
const buttonU = document.querySelector('button[id="btnUniJust"]')
buttonU.addEventListener('click', () => {
  par = getActiveStory()
 //////////// par.desiredWordSpacing = 100

  //console.log( par.lines.everyItem().textStyleRanges.everyItem() );
  // console.log( par.lines.item(3) );//.textStyleRanges.firstItem().designAxes[0] );

  /// JUH DER TUT  par.setNthDesignAxis(0,900);

  /*var erster = par.lines.firstItem().textStyleRanges.firstItem();
console.log( erster.contents, erster.designAxes );
erster.setNthDesignAxis(0,600);
*/

  /*
for(let i = 0; i < par.lines.length; i++ ){
  console.log( "--");
  for(let j = 0; j < par.lines.item(i).textStyleRanges.length; j++ ){
    //showUli( par.lines.item(i).textStyleRanges.item(j))
    //myStory.paragraphs[theParaCounter].lines[theLineCounter].characters[0]
    //console.log( "char", i, par.lines.item(i).characters.count(), par.lines.item(i).characters.everyItem() ); //.contents.join("-") );
    for(let k = 0; k < par.lines.item(i).characters.length; k++ ){
      //showUli( par.lines.item(i).characters.item(k))
      if( par.lines.item(i).characters.item(k).contents == "a"){
        par.lines.item(i).characters.item(k).setNthDesignAxis(0,600);
      }
    }
  }
} */

  const unitWidth = 4.457630581325958 / 28;

  // ZEILENWEISE
  for (let i = 0; i < par.lines.length; i++) {
    let myLine = par.lines.item(i);
    console.log('-- line', i, myLine)
    var spaceCounter = 0;
    var allLetterCounter = {};
    var accSpaceWidth = 0;
    // ZEICHENWEISE
    for (let k = 0; k < myLine.characters.length; k++) {
      let myLetter = myLine.characters.item(k).contents
      let myLetterWidth =
        myLine.characters.item(k).endHorizontalOffset -
        myLine.characters.item(k).horizontalOffset
      // console.log( myLetter, myLetterWidth )
      if ( myLetter == ' ') {
        // myLine.characters.item(k).contents="n";
        spaceCounter++
        accSpaceWidth += myLetterWidth;
      }
    }
    //ZEILENWEISE
    let minLeerrum = unitWidth * 8;
    let restUnits = ( accSpaceWidth - (spaceCounter * minLeerrum)) / unitWidth;
    console.log("-- lr", spaceCounter, "lrd", accSpaceWidth, "oU", unitWidth, "rU", restUnits)
    if (restUnits >= unitWidth * 12) {
      for (let k = 0; k < myLine.characters.length; k++) {
        if (myLine.characters.item(k).contents == 'e') {
          myLine.characters.item(k).setNthDesignAxis(0, 600)
        }
      }
    }

  }

  //par.lines.item(1).textStyleRanges.item(0).setNthDesignAxis(0,600);

  function showUli (uli) {
    console.log(
      uli.horizontalOffset.toFixed(0),
      uli.baseline.toFixed(0),
      uli.endHorizontalOffset.toFixed(0),
      uli.endBaseline.toFixed(0),
      uli.contents
    )
    uli.setNthDesignAxis(0, 300)
    uli.setNthDesignAxis(1, 300)
    uli.setNthDesignAxis(2, 100)
  }

  /*
  par.lines.everyItem().textStyleRanges.everyItem().properties.forEach( item => {
    console.log( item.contents, item.designAxes.join(","), item.endBaseline.toFixed(1), item.endHorizontalOffset.toFixed(1) );
    item.designAxes = [300,300,80];
  } );
  */
})

//expand
const buttonX = document.querySelector('button[id="btnExpandJust"]')
buttonX.addEventListener('click', () => {
  par = getActiveStory()
  par.desiredWordSpacing = Number(par.desiredWordSpacing) + 20
})

entrypoints.setup({
  commands: {
    showAlert: () => showAlert()
  },
  panels: {
    showPanel: {
      show ({ node } = {}) {}
    }
  }
})

// mode Alert
const modeAlertContainer = document.querySelector('#selection-status-alert')
const mode = document.querySelector('#mode')

setInterval(checkSelection, 500)

function checkSelection () {
  if (app.documents.length < 1) {
    console.debug('No documents open, aborting')
    modeAlertContainer.classList.add('alert__invalid')
    mode.textContent = 'Please open a document'
    return 'invalid'
  }

  if (app.selection.length > 1) {
    modeAlertContainer.classList.add('alert__invalid')
    mode.textContent = 'Please select only one layer (or nothing)'
    return 'invalid'
  }
  if (app.selection.length === 0) {
    modeAlertContainer.classList.remove('alert__invalid')
    mode.textContent = 'Using first Textframe (nothing selected)'
    return 'new'
  }
  /*   const selectionElement = app.selection[0];
    if (!(selectionElement instanceof Rectangle) && !(selectionElement instanceof Group)) {
        modeAlertContainer.classList.add('alert__invalid');
        mode.textContent = 'Please select a rectangle or group';
        return 'invalid';
    }*/

  modeAlertContainer.classList.remove('alert__invalid')
  mode.textContent = 'Replacing selection'
  return 'replace'
}

showAlert = () => {
  const dialog = app.dialogs.add()
  const col = dialog.dialogColumns.add()
  const colText = col.staticTexts.add()
  colText.staticLabel = 'Congratulations! You just executed your first command.'

  dialog.canCancel = false
  dialog.show()
  console.log('plugin panel created')
  dialog.destroy()
  console.log('plugin panel destroyed')

  return
}
