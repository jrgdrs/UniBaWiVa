/**
 * @preserve JustWithUnits is a polyfill that extends the typographical justification of textcolumns.
 *
 * It is developed by Jörg Drees (http://github.com/jrgdrs).
 * 
 * Easy integration in two steps:
 * 
 * (a) in the html/header add
 * 
 *      <script src="./JustWithUnits.js"></script>
 * 
 * (b) as last element of html/body add 
 * 
 *   <script type="text/javascript">window.onload = function () { new JustWithUnits('p')}</script>
 * 
 * where the 'p' stands for the CSS selector of the paragraphs that should be justified.
 * 
 * JustWithUnits gives an additional optional parameter where the justification can be configured, e.g.
 * 
 *   <script type="text/javascript">
 *        window.onload = function () { new JustWithUnits( 'p', 
 *        { overshootPercentage: 90, scaling: "unitized", algorithm: "knuth-and-plass", hyphenation: true } ); }
 *   </script>
 * 
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
  var implemented_by = 'jrgdrs'

  import { hyphenators } from './hyphenators';

  // FUNCTION
  function JustWithUnits (querySelection, userConfig ) {

    console.log( "querySelection", querySelection );

    // CONSTRUCTOR = Default settings
    this.overshootPercentage    = 90
    this.alignment              = 'align-justify'
    this.algorithm              = 'knuth-and-plass'
    this.scaling                = 'variable' 
    this.hyphenation            = true

    if( userConfig ){
      if( userConfig.overshootPercentage >= 0 && userConfig.overshootPercentage <= 100 ) this.overshootPercentage = userConfig.overshootPercentage; 
      if( ["align-justify", "align-center", "align-left", "align-right" ].includes( userConfig.alignment )) this.alignment = userConfig.alignment;
      if( ["greedy", "knuth-and-plass" ].includes( userConfig.algorithm )) this.algorithm = userConfig.algorithm;
      if( ["none", "traditional", "variable", "unitized" ].includes( userConfig.scaling )) this.scaling = userConfig.scaling;
      if( [true, false ].includes( userConfig.hyphenation )) this.hyphenation = userConfig.hyphenation;
    }

    console.log( this.overshootPercentage, this.alignment, this.algorithm, this.scaling, this.hyphenation );


    const theRuler = document.createElement("div");
    theRuler.setAttribute('id', 'ruler');
    theRuler.setAttribute('style', 'visibility: hidden; position: absolute; top: -8000px; width: auto; display: inline; left: -8000px;');
    theRuler.innerHTML= '&nbsp;';
    document.getElementsByTagName('body')[0].appendChild(theRuler);

    var theStyle = document.createElement('style');
    theStyle.type = 'text/css';
    theStyle.innerHTML = '.cssClass { color: #f00; } @font-face { font-family: TESTFONT; src: url(../development/OH.ttf); } body { font-family: TESTFONT; font-variation-settings: "wght" 300, "xtra" 300, "wdth" 100; } .line { display: flex; justify-content: space-between; position: relative; } .align-justify .line { justify-content: space-between; } .align-center .line { justify-content: center; } .align-left .line { justify-content: flex-start; } .align-right .line { justify-content: flex-end; } .align-justify .line:last-child, .align-left .line:last-child, .align-right .line:last-child { justify-content: flex-start; __background-color: white; } .align-right .line:last-child { justify-content: flex-end; } .line:last-child { justify-content: flex-start; } .word { __background-color: white; white-space: nowrap; } .space { __background-color: white; min-width: 0; } .hyphen { __background-color: white; } .pone { font-variation-settings: "wght" 300, "xtra" 300, "wdth" 110; color: var(--unitizedColor); }';
    document.getElementsByTagName('head')[0].appendChild(theStyle);
    
    const theElementsList = document.querySelectorAll(querySelection)
    for (let i = 0; i < theElementsList.length; i++) {
      console.log( "Element", i )
      var theElement = theElementsList[i]
      let theBoundingBox = theElement.getBoundingClientRect()
      theRuler.style.fontSize = window.getComputedStyle(theElement).getPropertyValue("font-size")
      //console.log( "font size in px", window.getComputedStyle(theElement).getPropertyValue("font-size") );
      var theMeasure = theBoundingBox['width']
      var theContent = theElement.innerHTML.replace(/\s\s+/g, ' ') // removes whitespace sequences
      let saveSpace = theElement.innerHTML
      theElement.innerHTML = ''
      // possible hyphens are integrated as vertical bar ##todo integrate hyphenator or https://github.com/mnater/Hyphenopoly
      let ruler = document.getElementById('ruler') 
      update(theContent, theMeasure, this.overshootPercentage, this.alignment, this.algorithm, this.scaling, this.hyphenation )
      if( theElement.innerHTML == '' ){
        theElement.innerHTML = saveSpace;
        //console.warn( "Something went wrong.")
      } else {
        //console.info( "Element sucessfully justified.")
      }
    }

    function measureText (str) {
      if (str === ' ') { str = '\u00A0' }
      ruler.textContent = str
      return ruler.getClientRects()[0].width
    }

    function typeset ( nodes, breaks, measure, algorithm, overshootPercentage, scaling ) {
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
      const overshootChars = ['-', '.', ':', ',', ';']

      // zeilenausgabe
      lines.forEach(function (line, lineIndex, lineArray) {
        let lineElement = document.createElement('div')

        lineElement.classList.add('line')
        lineElement.setAttribute('id', lineIndex) //DS

        //console.log( lineIndex )

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
              (measureText(overshootingChar) * overshootPercentage) / 100 +
              parseInt(measure) +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootPercentage) / 100
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
              (measureText(overshootingChar) * overshootPercentage) / 100 +
              parseInt(measure) / traditionalPercentage +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootPercentage) / 100
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
              (measureText(overshootingChar) * overshootPercentage) / 100 +
              parseInt(measure) +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootPercentage) / 100
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
              (measureText(overshootingChar) * overshootPercentage) / 100 +
              parseInt(measure) +
              'px'
            uiAddBarMargin =
              (measureText(overshootingChar) * overshootPercentage) / 100
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

    function update (text, theMeasure, theOvershootPercentage, theAlignment, theAlgorithm, theScaling, theHyphenation ) {
      let html = document.documentElement
      let measure = theMeasure
      let overshootPercentage = theOvershootPercentage
      let alignment = theAlignment
      let algorithm = theAlgorithm
      let scaling = theScaling 
      let hyphenation = theHyphenation

      let totalLeftOverSpace = 0

      if (algorithm === 'knuth-and-plass') {
        let { nodes, breaks } = kap( text, measureText, alignment, measure, hyphenation )
        totalLeftOverSpace = typeset( nodes, breaks, measure, algorithm, overshootPercentage, scaling )
      } else {
        let { nodes, breaks } = greedy( text, measureText, alignment, measure, hyphenation )
        totalLeftOverSpace = typeset( nodes, breaks, measure, algorithm, overshootPercentage, scaling )
      }
    }
  }

  ////PROTOTYPE
  JustWithUnits.prototype = {
    get go () {
      return this.implemented_by
    }
  }

  ///RETURN
  return JustWithUnits

})()


/// BRAMSTEIN LIBS

function greedy(text, measureText, alignment, measure, hyphenation) {
  if (!hyphenation) {
    text = text.replace(/\|/g, '');
  }

  let hyphenWidth = measureText('-');
  let spaceWidth = measureText('\u00A0') * 1; /// 20250408

  let nodes = text.split(/(\s|\|)/).map(function (fragment) {
    if (fragment === ' ') {
      return linebreak.glue(spaceWidth, spaceWidth, spaceWidth);
    } else if (fragment === '|') {
      return linebreak.penalty(hyphenWidth, 100, 1);
    } else {
      return linebreak.box(measureText(fragment), fragment);
    }
  });

  nodes.push(linebreak.glue(0, linebreak.infinity, 0));
  nodes.push(linebreak.penalty(0, -linebreak.infinity, 1));

  let currentLineWidth = 0;
  let breaks = [{ position: 0, ratio: 1 }];

  for (let i = 0; i < nodes.length - 1; i++) {
    // the current node doesn't fit on the line
    if (nodes[i].width + currentLineWidth > measure) {
      // If the current node is a space we ignore its width
      // and move to the next line. In this case the previous
      // node is always a box, so we use that as our breakpoint.
      if (nodes[i].type === 'glue') {
        breaks.push({ position: i, ratio: 1 });
        currentLineWidth = 0;
      // If the current node is a box and the previous node is a penalty
      // we move the word-part to the next line.
      } if (nodes[i].type === 'box' && nodes[i - 1].type === 'penalty') {

        breaks.push({ position: i - 1, ratio: 1 });
        currentLineWidth = nodes[i].width;

      // if the current node is a box the previous node is glue. In this
      // case we skip the glue and grab the box before the glue as the breakpoint.
      } else if (nodes[i].type === 'box' && nodes[i - 1].type === 'glue') {
        breaks.push({ position: i - 1, ratio: 1 });
        currentLineWidth = nodes[i].width;
      // if the current node is a penalty and the previous node is box we
      // need to move everything up to the previous penalty or glue to the
      // next line.
      } else if (nodes[i].type === 'penalty' && nodes[i - 1].type === 'box') {
        breaks.push({ position: i - 2, ratio: 1 });
        currentLineWidth = nodes[i - 1].width;
      }
    } else {
      if (nodes[i].type !== 'penalty') {
        currentLineWidth += nodes[i].width;
      }
    }
  }

  breaks.push({ position: nodes.length, ratio: 1 });

  return { nodes, breaks };
}


function kap(text, measureText, alignment, measure, hyphenation) {

  if (!hyphenation) {
    text = text.replace(/\|/g, '');
  }

  let hyphenWidth = measureText('-');
  let spaceWidth = measureText('\u00A0') * 1; /// 20250408
  ///console.log( hyphenWidth, spaceWidth );
  let nodes = [];

  if (alignment === 'align-center') {
    nodes.push(linebreak.box(0, ''));
    nodes.push(linebreak.glue(0, 12, 0));
  }

  text.split(/(\s|\|)/).forEach(function (fragment) {
    if (alignment === 'align-justify') {
      if (fragment === ' ') {
        let stretch = (spaceWidth * 3)  / 6;
        let shrink = (spaceWidth * 3) / 9;

        nodes.push(linebreak.glue(spaceWidth, stretch, shrink));
      } else if (fragment === '|') {
        nodes.push(linebreak.penalty(hyphenWidth, 100, 1));
      } else {
        nodes.push(linebreak.box(measureText(fragment), fragment));
      }
    } else if (alignment === 'align-center') {
      if (fragment === ' ') {
        nodes.push(linebreak.glue(0, 12, 0));
        nodes.push(linebreak.penalty(0, 0, 0));
        nodes.push(linebreak.glue(spaceWidth, -24, 0));
        nodes.push(linebreak.box(0, ''));
        nodes.push(linebreak.penalty(0, linebreak.infinity, 0));
        nodes.push(linebreak.glue(0, 12, 0));
      } else if (fragment === '|') {
        nodes.push(linebreak.penalty(hyphenWidth, 100, 1));
      } else {
        nodes.push(linebreak.box(measureText(fragment), fragment));
      }
    } else if (alignment === 'align-left' || alignment === 'align-right') {
      if (fragment === ' ') {
        let stretch = (spaceWidth * 3)  / 6;
        let shrink = (spaceWidth * 3) / 9;

        nodes.push(linebreak.glue(0, 12, 0));
        nodes.push(linebreak.penalty(0, 0, 0));
        nodes.push(linebreak.glue(spaceWidth, -12, 0));
      } else if (fragment === '|') {
        nodes.push(linebreak.penalty(hyphenWidth, 100, 1));
      } else {
        nodes.push(linebreak.box(measureText(fragment), fragment));
      }
    }
  });

  if (alignment === 'align-justify') {
    nodes.push(linebreak.glue(0, linebreak.infinity, 0));
    nodes.push(linebreak.penalty(0, -linebreak.infinity, 1));
  } else if (alignment === 'align-center') {
    nodes.push(linebreak.glue(0, 12, 0));
    nodes.push(linebreak.penalty(0, -linebreak.infinity, 0));
  } else if (alignment === 'align-left' || alignment === 'align-right') {
    nodes.push(linebreak.glue(0, linebreak.infinity, 0));
    nodes.push(linebreak.penalty(0, -linebreak.infinity, 1));
  }

  let demerits = {
    line: 10,
    flagged: 100,
    fitness: 3000
  };

  let breaks = linebreak(nodes, [measure], { tolerance: 3, demerits });

  if (!breaks.length) {
    breaks = linebreak(nodes, [measure], { tolerance: 10, demerits });
  }

  return { nodes, breaks };
}


var linebreak = function (nodes, lines, settings = {
  demerits: {
    line: 10,
    flagged: 100,
    fitness: 3000
  },
  tolerance: 2
}) {
  
  const options = settings;
  activeNodes = new LinkedList(),
  sum = {
    width: 0,
    stretch: 0,
    shrink: 0
  },
  lineLengths = lines,
  breaks = [],
  tmp = {
    data: {
      demerits: Infinity
    }
  };

  function breakpoint(position, demerits, ratio, line, fitnessClass, totals, previous) {
    return {
      position: position,
      demerits: demerits,
      ratio: ratio,
      line: line,
      fitnessClass: fitnessClass,
      totals: totals || {
        width: 0,
        stretch: 0,
        shrink: 0
      },
      previous: previous
    };
  }

  function computeCost(start, end, active, currentLine) {
    var width = sum.width - active.totals.width,
    stretch = 0,
    shrink = 0,
    // If the current line index is within the list of linelengths, use it, otherwise use
    // the last line length of the list.
    lineLength = currentLine < lineLengths.length ? lineLengths[currentLine - 1] : lineLengths[lineLengths.length - 1];

    if (nodes[end].type === 'penalty') {
      width += nodes[end].width;
    }

    if (width < lineLength) {
      // Calculate the stretch ratio
      stretch = sum.stretch - active.totals.stretch;

      if (stretch > 0) {
        return (lineLength - width) / stretch;
      } else {
        return linebreak.infinity;
      }

    } else if (width > lineLength) {
      // Calculate the shrink ratio
      shrink = sum.shrink - active.totals.shrink;

      if (shrink > 0) {
        return (lineLength - width) / shrink;
      } else {
        return linebreak.infinity;
      }
    } else {
      // perfect match
      return 0;
    }
  }


  // Add width, stretch and shrink values from the current
  // break point up to the next box or forced penalty.
  function computeSum(breakPointIndex) {
    var result = {
        width: sum.width,
        stretch: sum.stretch,
        shrink: sum.shrink
      },
      i = 0;

    for (i = breakPointIndex; i < nodes.length; i += 1) {
      if (nodes[i].type === 'glue') {
        result.width += nodes[i].width;
        result.stretch += nodes[i].stretch;
        result.shrink += nodes[i].shrink;
      } else if (nodes[i].type === 'box' || (nodes[i].type === 'penalty' && nodes[i].penalty === -linebreak.infinity && i > breakPointIndex)) {
        break;
      }
    }
    return result;
  }

  let graphNodes = [];
  let graphEdges = [];

  // The main loop of the algorithm
  function mainLoop(node, index, nodes) {
    var active = activeNodes.first,
      next = null,
      ratio = 0,
      demerits = 0,
      candidates = [],
      badness,
      currentLine = 0,
      tmpSum,
      currentClass = 0,
      fitnessClass,
      candidate,
      newNode;

    // The inner loop iterates through all the active nodes with line < currentLine and then
    // breaks out to insert the new active node candidates before looking at the next active
    // nodes for the next lines. The result of this is that the active node list is always
    // sorted by line number.
    while (active !== null) {

      candidates = [{
        demerits: Infinity
      }, {
        demerits: Infinity
      }, {
        demerits: Infinity
      }, {
        demerits: Infinity
      }];

      // Iterate through the linked list of active nodes to find new potential active nodes
      // and deactivate current active nodes.
      while (active !== null) {
        next = active.next;
        currentLine = active.data.line + 1;
        ratio = computeCost(active.data.position, index, active.data, currentLine);

        // Deactive nodes when the distance between the current active node and the
        // current node becomes too large (i.e. it exceeds the stretch limit and the stretch
        // ratio becomes negative) or when the current node is a forced break (i.e. the end
        // of the paragraph when we want to remove all active nodes, but possibly have a final
        // candidate active node---if the paragraph can be set using the given tolerance value.)
        if (ratio < -1 || (node.type === 'penalty' && node.penalty === -linebreak.infinity)) {
          activeNodes.remove(active);
        }

        // If the ratio is within the valid range of -1 <= ratio <= tolerance calculate the
        // total demerits and record a candidate active node.
        if (-1 <= ratio && ratio <= options.tolerance) {
          badness = 100 * Math.pow(Math.abs(ratio), 3);

          // Positive penalty
          if (node.type === 'penalty' && node.penalty >= 0) {
            demerits = Math.pow(options.demerits.line + badness, 2) + Math.pow(node.penalty, 2);
          // Negative penalty but not a forced break
          } else if (node.type === 'penalty' && node.penalty !== -linebreak.infinity) {
            demerits = Math.pow(options.demerits.line + badness, 2) - Math.pow(node.penalty, 2);
          // All other cases
          } else {
            demerits = Math.pow(options.demerits.line + badness, 2);
          }

          if (node.type === 'penalty' && nodes[active.data.position].type === 'penalty') {
            demerits += options.demerits.flagged * node.flagged * nodes[active.data.position].flagged;
          }

          // Calculate the fitness class for this candidate active node.
          if (ratio < -0.5) {
            currentClass = 0;
          } else if (ratio <= 0.5) {
            currentClass = 1;
          } else if (ratio <= 1) {
            currentClass = 2;
          } else {
            currentClass = 3;
          }

          // Add a fitness penalty to the demerits if the fitness classes of two adjacent lines
          // differ too much.
          if (Math.abs(currentClass - active.data.fitnessClass) > 1) {
            demerits += options.demerits.fitness;
          }

          // Add the total demerits of the active node to get the total demerits of this candidate node.
          demerits += active.data.demerits;

          // Only store the best candidate for each fitness class
          if (demerits < candidates[currentClass].demerits) {
            candidates[currentClass] = {
              active: active,
              demerits: demerits,
              ratio: ratio
            };
          }
        }

        active = next;

        // Stop iterating through active nodes to insert new candidate active nodes in the active list
        // before moving on to the active nodes for the next line.
        // TODO: The Knuth and Plass paper suggests a conditional for currentLine < j0. This means paragraphs
        // with identical line lengths will not be sorted by line number. Find out if that is a desirable outcome.
        // For now I left this out, as it only adds minimal overhead to the algorithm and keeping the active node
        // list sorted has a higher priority.
        if (active !== null && active.data.line >= currentLine) {
          break;
        }
      }

      tmpSum = computeSum(index);

      for (fitnessClass = 0; fitnessClass < candidates.length; fitnessClass += 1) {
        candidate = candidates[fitnessClass];

        if (candidate.demerits < Infinity) {
          newNode = new Node(breakpoint(index, candidate.demerits, candidate.ratio,
            candidate.active.data.line + 1, fitnessClass, tmpSum, candidate.active));

          graphNodes.push({
            id: index
          });

          graphEdges.push({
            from: index,
            to: candidate.active.data.position,
            label: candidate.ratio.toFixed(2)
          });

          if (active !== null) {
            activeNodes.insertBefore(active, newNode);
          } else {
            activeNodes.push(newNode);
          }
        }
      }
    }
  }

  // Add an active node for the start of the paragraph.
  activeNodes.push(new Node(breakpoint(0, 0, 0, 0, 0, undefined, null)));

  graphNodes.push({
    id: 0
  });

  nodes.forEach(function (node, index, nodes) {
    if (node.type === 'box') {
      sum.width += node.width;
    } else if (node.type === 'glue') {
      if (index > 0 && nodes[index - 1].type === 'box') {
        mainLoop(node, index, nodes);
      }
      sum.width += node.width;
      sum.stretch += node.stretch;
      sum.shrink += node.shrink;
    } else if (node.type === 'penalty' && node.penalty !== linebreak.infinity) {
      mainLoop(node, index, nodes);
    }
  });


  if (activeNodes.size !== 0) {
    // Find the best active node (the one with the least total demerits.)
    activeNodes.forEach(function (node) {
      if (node.data.demerits < tmp.data.demerits) {
        tmp = node;
      }
    });

    graphNodes.forEach(function (n) {
      let label = nodes[n.id].value;

      if (nodes[n.id].type === 'glue') {
        label = nodes[n.id - 1].value;
      } else if (nodes[n.id].type === 'penalty') {
        label = nodes[n.id - 1].value;
      } else {
        label = nodes[n.id].value;
      }
      n.label = label;
    });

    while (tmp !== null) {
      breaks.push({
        position: tmp.data.position,
        ratio: tmp.data.ratio
      });
      tmp = tmp.data.previous;
    }
    return breaks.reverse();
  } else {
    console.warn('Overfull paragraph.', activeNodes.size);  /// 20250408
  }
  return [];
};

linebreak.infinity = 10000;

linebreak.glue = function (width, stretch, shrink) {
  return {
    type: 'glue',
    width: width,
    stretch: stretch,
    shrink: shrink
  };
};

linebreak.box = function (width, value) {
  return {
    type: 'box',
    width: width,
    value: value
  };
};

linebreak.penalty = function (width, penalty, flagged) {
  return {
    type: 'penalty',
    width: width,
    penalty: penalty,
    flagged: flagged
  };
};


class LinkedList {
  constructor() {
     this.head = null;
    this.tail = null;
    this.listSize = 0;
  }

  get size() {
    return this.listSize;
  }

  isLinked(node) {
    return !((node && node.prev === null && node.next === null && this.tail !== node && this.head !== node) || this.isEmpty());
  }

  isEmpty() {
    return this.listSize === 0;
  }

  get first() {
    return this.head;
  }

  get last() {
    return this.last;
  }


  toString() {
    return this.toArray().toString();
  }

  toArray() {
    var node = this.head,
    result = [];
    while (node !== null) {
        result.push(node);
        node = node.next;
    }
    return result;
  }

  // Note that modifying the list during
  // iteration is not safe.
  forEach(fun) {
    var node = this.head;
    while (node !== null) {
        fun(node);
        node = node.next;
    }
  }

  contains(n) {
    var node = this.head;
    if (!this.isLinked(n)) {
        return false;
    }
    while (node !== null) {
        if (node === n) {
            return true;
        }
        node = node.next;
    }
    return false;
  }

  at(i) {
    var node = this.head, index = 0;

    if (i >= this.listLength || i < 0) {
        return null;
    }

    while (node !== null) {
        if (i === index) {
            return node;
        }
        node = node.next;
        index += 1;
    }
    return null;
  }

  insertAfter(node, newNode) {
    if (!this.isLinked(node)) {
        return this;
    }
    newNode.prev = node;
    newNode.next = node.next;
    if (node.next === null) {
        this.tail = newNode;
    } else {
        node.next.prev = newNode;
    }
    node.next = newNode;
    this.listSize += 1;
    return this;
  }

  insertBefore(node, newNode) {
    if (!this.isLinked(node)) {
        return this;
    }
    newNode.prev = node.prev;
    newNode.next = node;
    if (node.prev === null) {
        this.head = newNode;
    } else {
        node.prev.next = newNode;
    }
    node.prev = newNode;
    this.listSize += 1;
    return this;
  }

  push(node) {
    if (this.head === null) {
        this.unshift(node);
    } else {
        this.insertAfter(this.tail, node);
    }
    return this;
  }

  unshift(node) {
    if (this.head === null) {
        this.head = node;
        this.tail = node;
        node.prev = null;
        node.next = null;
        this.listSize += 1;
    } else {
        this.insertBefore(this.head, node);
    }
    return this;
  }

  remove(node) {
    if (!this.isLinked(node)) {
        return this;
    }
    if (node.prev === null) {
        this.head = node.next;
    } else {
        node.prev.next = node.next;
    }
    if (node.next === null) {
        this.tail = node.prev;
    } else {
        node.next.prev = node.prev;
    }
    this.listSize -= 1;
    return this;
  }

  pop() {
    var node = this.tail;
    this.tail.prev.next = null;
    this.tail = this.tail.prev;
    this.listSize -= 1;
    node.prev = null;
    node.next = null;
    return node;
  }

  shift() {
    var node = this.head;
    this.head.next.prev = null;
    this.head = this.head.next;
    this.listSize -= 1;
    node.prev = null;
    node.next = null;
    return node;
  }
}

class Node {
  constructor(data) {
    this.prev = null;
    this.next = null;
    this.data = data;
  }

  toString() {
    return this.data.toString();
  }
}
