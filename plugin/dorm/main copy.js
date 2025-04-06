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

var par = app.activeDocument.stories.firstItem()
//var par = app.selection[0]
console.log( par );



const button = document.querySelector('button[id="btnChangeJust"]')
button.addEventListener('click', () => {
 /// var par = app.activeDocument.stories.firstItem()
  // Der Cursor muss in einem Absatz positioniert sein:
  ///if (app.selection[0].constructor.name == "InsertionPoint") {
  ///  var par = app.selection[0].paragraphs[0];
  var lines = par.lines.length
  var oldDesiredWordSpacing = Number(par.desiredWordSpacing)
  var cDesiredWordSpacing = Number(par.desiredWordSpacing)

  // WordSpacing solange verringern bis eine Zeile weniger
  while (par.lines.length == lines && cDesiredWordSpacing > 65) {
    // Das etwas unübersichtliche Konzpet erlaubt danach ein
    // einmaliges STRG + Z für das Rückgängig
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
  console.log(par.desiredWordSpacing)
})

const buttonR = document.querySelector('button[id="btnResetJust"]')
buttonR.addEventListener('click', () => {
  ///var par = app.activeDocument.stories.firstItem()
  par.desiredWordSpacing = 100

  console.log(par.desiredWordSpacing)
})

const buttonX = document.querySelector('button[id="btnExpandJust"]')
buttonX.addEventListener('click', () => {
  par.desiredWordSpacing = Number(par.desiredWordSpacing) + 20
  console.log(par.desiredWordSpacing)
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
