/**
 * @preserve JustWithUnits is a polyfill that extends the typographical justification of textcolumns.
 *
 * It is developed by Jörg Drees (http://github.com/jrgdrs).
 * It includes features such as:
 *		- Configurable column widths, gutters and margins
 *		- Rapid reflow as required by events
 * It is designed with the same specification API as the CSS3 specification (http://www.w3.org/TR/css3/),
 * but gives far greater flexibility over elements positioning and transformations within the lines.
 *
 * @copyright Jörg Drees [All Rights Reserved]
 * @license MIT License (see LICENCE.txt)
 *
 * https://github.com/jrgdrs/JustWithUnits
 */

var JustWithUnits = (function () {
  'use strict'

  // EXCEPTION CLASS
  function JustWithUnitsException (name, message) {
    this.name = 'JustWithUnits' + name || 'JustWithUnitsException'
    this.message = message || ''
  }
  JustWithUnitsException.prototype = new Error()
  JustWithUnitsException.constructor = JustWithUnitsException

  // SCOPE DEFINITON
  var Joerg = 'Joerg'

  // FUNCTION
  function JustWithUnits (querySelection) {
    // CONSTRUCTOR
    // this.querySelection = ".justWithUnits";

    const theElementsList = document.querySelectorAll(querySelection)
    for (let i = 0; i < theElementsList.length; i++) {
      var theElement = theElementsList[i]
      let theBoundingBox = theElement.getBoundingClientRect()
      var theMeasure = theBoundingBox['width']
      var theContent = theElement.innerHTML.replace(/\s\s+/g, ' ') // removes whitespace sequences
      theElement.innerHTML = ''
      // possible hyphens are integrated as vertical bar ##todo integrate hyphenator or https://github.com/mnater/Hyphenopoly
      let ruler = document.getElementById('ruler') // #TODO pull complete ruler into javascript
      update(theContent, theMeasure)
    }

    function measureText (str) {
      if (str === ' ') { str = '\u00A0' }
      ruler.textContent = str
      return ruler.getClientRects()[0].width
    }

    function typeset ( nodes, breaks, measure, algorithm, overshootFactor, scaling ) {
      let container = document.createDocumentFragment()
      let lineStart = 0
      let lines = []
      let totalSpace = 0

      for (let i = 1; i < breaks.length; i++) {
        let point = breaks[i].position
        let ratio = breaks[i].ratio

        for (let j = lineStart; j < nodes.length; j++) {
          if (
            nodes[j].type === 'box' ||
            (nodes[j].type === 'penalty' &&
              nodes.penalty === -linebreak.infinity)
          ) {
            lineStart = j
            break
          }
        }
        lines.push({
          ratio,
          nodes: nodes.slice(lineStart, point + 1),
          position: point
        })
        lineStart = point
      }

      // Optischer Randausgleich (bislang nur auf rechter Satzkante)
      ////var overshootFactor = .85; // Anteil der optischen Randausgleichs vom Zeichen, jetzt über Slider einstellbar
      const overshootChars = ['-', '.', ':', ',', ';']

      // zeilenausgabe
      lines.forEach(function (line, lineIndex, lineArray) {
        let lineElement = document.createElement('div')

        lineElement.classList.add('line')
        lineElement.setAttribute('id', lineIndex) //DS

        lineElement.dataset.ratio = line.ratio

        let totalWidth = 0

        line.nodes.forEach(function (n, index, array) {
          if (n.type === 'box' && n.value !== '') {
            if (
              index > 0 &&
              array[index - 1].type === 'penalty' &&
              lineElement.lastChild
            ) {
              lineElement.lastChild.textContent += n.value
              totalWidth += n.width
            } else {
              var word = document.createElement('div')
              word.classList.add('word')
              word.textContent = n.value
              lineElement.appendChild(word)
              totalWidth += n.width
            }
          } else if (
            n.type === 'glue' &&
            n.width !== 0 &&
            index < array.length - 1
          ) {
            var space = document.createElement('div')
            space.textContent = '\u00A0'
            space.classList.add('space')
            lineElement.appendChild(space)
            totalWidth += n.width
          } else if (
            n.type === 'penalty' &&
            n.penalty === 100 &&
            index === array.length - 1
          ) {
            var hyphen = document.createElement('span')
            hyphen.textContent = '-'
            hyphen.classList.add('hyphen')
            lineElement.lastChild.appendChild(hyphen)
            totalWidth += n.width
          }
        })

        let leftOverSpace = measure - totalWidth
        let uiAddBarMargin = 0

        ///////////////////////////////////////////////////////////////////////////////////////////////
        // No Scaling = just whitespace

        if (scaling == 'none' && lineIndex !== lineArray.length - 1) {
          // optischer randausgleich
          let overshootingChar = lineElement.lastChild
            ? lineElement.lastChild.textContent[
                lineElement.lastChild.textContent.length - 1
              ]
            : ''
          if (overshootChars.includes(overshootingChar)) {
            lineElement.style.width =
              (measureText(overshootingChar) * overshootFactor) / 10 +
              parseInt(measure) +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootFactor) / 10
          }
        }

        leftOverSpace += uiAddBarMargin

        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Traditional Scaling = unproportional letter scaling within limits, rest whitespaces

        if (scaling == 'traditional' && lineIndex !== lineArray.length - 1) {
          let maxTraditionalPercentageLimit = 10
          let traditionalPercentage = measure / totalWidth
          if (traditionalPercentage > 1) {
            traditionalPercentage = Math.min(
              traditionalPercentage,
              1 + maxTraditionalPercentageLimit / 100
            )
          } else {
            traditionalPercentage = Math.max(
              traditionalPercentage,
              1 - maxTraditionalPercentageLimit / 100
            )
          }
          //console.log("traditionalPercentage", traditionalPercentage) // 0.98 nur bei Knuth, sonst nur pos. also bei max beschränken

          lineElement.style.width =
            parseInt(measure) / traditionalPercentage + 'px'
          lineElement.style.transform = 'scale(' + traditionalPercentage + ',1)'
          lineElement.style.transformOrigin = 'top left'
          lineElement.style.position = 'relative'
          lineElement.style.top = '0px'

          // optischer randausgleich
          let overshootingChar = lineElement.lastChild
            ? lineElement.lastChild.textContent[
                lineElement.lastChild.textContent.length - 1
              ]
            : ''
          if (overshootChars.includes(overshootingChar)) {
            lineElement.style.width =
              (measureText(overshootingChar) * overshootFactor) / 10 +
              parseInt(measure) / traditionalPercentage +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootFactor) / 10
          }

          leftOverSpace =
            measure - totalWidth * traditionalPercentage + uiAddBarMargin
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Variable Scaling = ...

        if (scaling == 'variable' && lineIndex !== lineArray.length - 1) {
          let percentage = 15
          let leftOverPercentage = Math.abs((leftOverSpace / measure) * 100)
          let actualPercentage = Math.min(leftOverPercentage, percentage)
          let reduction = (measure / 100) * actualPercentage

          // font-variation-settings: "wght" 300, "xtra" 300, "wdth" 100;
          if (leftOverSpace > 0) {
            // extend
            leftOverSpace = measure - totalWidth - reduction
            lineElement.style.fontVariationSettings =
              '"wght" 300, "xtra" 300, "wdth" ' +
              (100 + Math.min(actualPercentage, percentage))
          } else {
            // shrink
            leftOverSpace = measure - totalWidth + reduction
            lineElement.style.fontVariationSettings =
              '"wght" 300, "xtra" 300, "wdth" ' +
              (100 - Math.min(actualPercentage, percentage))
          }

          // optischer randausgleich
          let overshootingChar = lineElement.lastChild
            ? lineElement.lastChild.textContent[
                lineElement.lastChild.textContent.length - 1
              ]
            : ''
          if (overshootChars.includes(overshootingChar)) {
            lineElement.style.width =
              (measureText(overshootingChar) * overshootFactor) / 10 +
              parseInt(measure) +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootFactor) / 10
          }

          leftOverSpace = +uiAddBarMargin
        }

        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Unitized Scaling

        let compensationSpace = leftOverSpace + 0

        if (scaling == 'unitized' && lineIndex !== lineArray.length - 1) {
          let unitWidth = 0.41015625 // 1/28 n width
          let content = lineElement.textContent
          let spaceCount = (content.match(/\s/g) || []).length
          // sequence of increasing disturbance
          let needles = [ 'e', 'c', 's', 'a', 'i', 'f', 'r', 't', 'f', 'x', 'w', 'v', 'z', 'p', 'b', 'q', 'd', 'g', 'm', 'h', 'u', 'n', 'o' ]

          needles.forEach(needle => {
            let occ = (content.match(new RegExp(needle, 'g')) || []).length
            // erweitern
            if (occ * unitWidth <= compensationSpace) {
              ///console.log(compensationSpace, needle, lineElement.innerHTML);
              //lineElement.innerHTML = lineElement.innerHTML.replaceAll("&nbsp;", "--*--").replaceAll((new RegExp("(?<!<[^>]*)"+needle+"(?![^<]*>)", "g")), "<span class='pone'>" +  needle + "</span>").replaceAll( "--*--", "&nbsp;");
              // wegen Unterschneidung erweitert um Großbuchstabe vor needle
              lineElement.innerHTML = lineElement.innerHTML
                .replaceAll('&nbsp;', '--*--')
                .replaceAll(
                  new RegExp(
                    '(?<!<[^>]*)([A-Z]?)' + needle + '(?![^<]*>)',
                    'g'
                  ),
                  "<span class='pone'>$1" + needle + '</span>'
                )
                .replaceAll('--*--', '&nbsp;')
                .replaceAll("</span><span class='pone'>", '')
              compensationSpace -= occ * unitWidth
            }
            //reduzieren machr keinen sinn mehr, da die zeile bereits kompress steht und reduzieren nur die whitespaces erweitern würde
          })

          // optischer randausgleich
          let overshootingChar = lineElement.lastChild
            ? lineElement.lastChild.textContent[
                lineElement.lastChild.textContent.length - 1
              ]
            : ''
          if (overshootChars.includes(overshootingChar)) {
            lineElement.style.width =
              (measureText(overshootingChar) * overshootFactor) / 10 +
              parseInt(measure) +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootFactor) / 10
          }

          leftOverSpace = compensationSpace + uiAddBarMargin
        }

        container.appendChild(lineElement)

        if (lineIndex !== lineArray.length - 1) {
          totalSpace += Math.abs(leftOverSpace)
        }
      })

      theElement.appendChild(container)

      return totalSpace
    }

    function update (text, theMeasure) {
      let html = document.documentElement
      let measure = theMeasure
      let overshootFactor = 9 // 0-10
      let alignment = 'align-justify'
      let algorithm = 'knuth-and-plass'
      let scaling = 'variable'
      let hyphenation = true

      let totalLeftOverSpace = 0

      if (algorithm === 'knuth-and-plass') {
        let { nodes, breaks } = kap( text, measureText, alignment, measure, hyphenation )
        totalLeftOverSpace = typeset( nodes, breaks, measure, algorithm, overshootFactor, scaling )
      } else {
        let { nodes, breaks } = greedy( text, measureText, alignment, measure, hyphenation )
        totalLeftOverSpace = typeset( nodes, breaks, measure, algorithm, overshootFactor, scaling )
      }
    }
  }

  ////PROTOTYPE
  JustWithUnits.prototype = {
    get go () {
      return this.Joerg
    }
  }

  ///RETURN
  return JustWithUnits

})()
