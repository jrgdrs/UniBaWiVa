function greedy(text, measureText, alignment, measure, hyphenation, optical) {
  if (!hyphenation) {
    text = text.replace(/\|/g, '');
  }

  let hyphenWidth = measureText('-');
  let spaceWidth = measureText('\u00A0');

  // text in nodes
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

  console.error( "nodes", nodes );

  /*** 
  0 {type: "box", width: 21.75, value: "In"}
  1 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  2 {type: "box", width: 59.234375, value: "olden"}
  3 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  4 {type: "box", width: 58.6875, value: "times"}
  5 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  6 {type: "box", width: 57.5625, value: "when"}
  7 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  8 {type: "box", width: 48.671875, value: "wish"}
  9 {type: "penalty", width: 7.234375, penalty: 100, flagged: 1}
  10 {type: "box", width: 33.515625, value: "ing"}
  11 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  12 {type: "box", width: 38.8125, value: "still"}
  13 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  14 {type: "box", width: 70.5625, value: "helped"}
  15 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  16 {type: "box", width: 44.40625, value: "one,"}
  17 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  18 {type: "box", width: 54.921875, value: "there"}
  19 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  20 {type: "box", width: 51.125, value: "lived"}
  21 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  22 {type: "box", width: 11.625, value: "a"}
  23 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  24 {type: "box", width: 45.9375, value: "king"}
  25 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  26 {type: "box", width: 66.5625, value: "whose"}
  27 {type: "glue", width: 4.96875, stretch: 4.96875, shrink: 4.96875}
  28 {type: "box", width: 65.140625, value: "daugh"}
  29 {type: "penalty", width: 7.234375, penalty: 100, flagged: 1}
  30 {type: "box", width: 39.421875, value: "ters"}
  */

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

  console.error( "breaks", breaks );

  /*
  0 {position: 0, ratio: 1}
  1 {position: 17, ratio: 1}
  2 {position: 35, ratio: 1}
  3 {position: 53, ratio: 1}
  4 {position: 71, ratio: 1}
  5 {position: 93, ratio: 1}
  6 {position: 113, ratio: 1}
  7 {position: 135, ratio: 1}
  8 {position: 157, ratio: 1}
  9 {position: 179, ratio: 1}
  10 {position: 201, ratio: 1}
  11 {position: 217, ratio: 1}
  */

  return { nodes, breaks };
}
