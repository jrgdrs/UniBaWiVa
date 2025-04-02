function kap(text, measureText, alignment, measure, hyphenation, optical) {
  if (!hyphenation) {
    text = text.replace(/\|/g, '');
  }

  let hyphenWidth = measureText('-');
  let spaceWidth = measureText('\u00A0');
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

  console.error( "nodes", nodes );

  /*
  0 {type: "box", width: 21.75, value: "In"}
  1 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  2 {type: "box", width: 59.234375, value: "olden"}
  3 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  4 {type: "box", width: 58.6875, value: "times"}
  5 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  6 {type: "box", width: 57.5625, value: "when"}
  7 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  8 {type: "box", width: 48.671875, value: "wish"}
  9 {type: "penalty", width: 7.234375, penalty: 100, flagged: 1}
  10 {type: "box", width: 33.515625, value: "ing"}
  11 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  12 {type: "box", width: 38.8125, value: "still"}
  13 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  14 {type: "box", width: 70.5625, value: "helped"}
  15 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  16 {type: "box", width: 44.40625, value: "one,"}
  17 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  18 {type: "box", width: 54.921875, value: "there"}
  19 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  20 {type: "box", width: 51.125, value: "lived"}
  21 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  22 {type: "box", width: 11.625, value: "a"}
  23 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  24 {type: "box", width: 45.9375, value: "king"}
  25 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  26 {type: "box", width: 66.5625, value: "whose"}
  27 {type: "glue", width: 4.96875, stretch: 2.484375, shrink: 1.65625}
  28 {type: "box", width: 65.140625, value: "daugh"}
  29 {type: "penalty", width: 7.234375, penalty: 100, flagged: 1}
  30 {type: "box", width: 39.421875, value: "ters"}
  */

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

  console.error( "breaks", breaks );

  /*
  0 {position: 0, ratio: 0}
  1 {position: 17, ratio: -0.7749326145552561}
  2 {position: 35, ratio: 0.8319856244384546}
  3 {position: 55, ratio: 1.539832285115304}
  4 {position: 75, ratio: 2.470125786163522}
  5 {position: 95, ratio: 0.5513626834381551}
  6 {position: 117, ratio: 0.06918238993710692}
  7 {position: 139, ratio: -0.36202830188679247}
  8 {position: 161, ratio: 0.0573025856044724}
  9 {position: 181, ratio: 0.1391509433962264}
  10 {position: 201, ratio: 0.07075471698113207}
  11 {position: 219, ratio: 0.4937106918238994}
  12 {position: 241, ratio: 0.14339622641509434}
  13 {position: 252, ratio: 0.022702782055166338}
  */

  return { nodes, breaks };
}
