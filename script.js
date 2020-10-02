const width = 650;
const height = 890;

const TONICS = [
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
];

const SCALES = [
  "Major",
  "Minor",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Locrian",
  "Major Pentatonic",
  "Minor Pentatonic",
  "Chromatic",
  "Blues",
  "Double Harmonic",
  "Flamenco",
  "Harmonic Minor",
  "Melodic Minor",
  "Wholetone",
];

const KEY_CONTROLS = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];

$("#play-button").on("click", ({ currentTarget }) => {
  pad.triggerRelease();
  Tone.Transport.toggle();
});

let isMousePressed = false;
const getIsMousePressed = () => isMousePressed;

// const synth = new Tone.Synth().toMaster();
const pad = new Tone.Sampler({
  urls: { C1: "Synth-EtnicFluteBow3lower.wav" },
  release: 0.9,
  baseUrl: "samples/",
  onload: () => {
    // Tone.Transport.start();
  },
});

const synth = new Tone.Sampler({
  urls: {
    E1: "e2.wav",
    C0: "c1.wav",
  },
  baseUrl: "samples/sid_grand/",
});

const chorus = new Tone.Chorus({
  frequency: 1.5,
  delayTime: 3.5,
  depth: 0.7,
  spread: 180,
});

const delay = new Tone.FeedbackDelay({
  delayTime: 0.2,
  feedback: 0.3,
  wet: 0.3,
});

const reverb = new Tone.JCReverb({ roomSize: 0.8, wet: 0.7 });
const reverb2 = new Tone.JCReverb({ roomSize: 0.3, wet: 0.4 });

const compressor = new Tone.Compressor();
const distortion = new Tone.Distortion(0.01);
synth.chain(chorus, delay, reverb2, new Tone.Gain(0.7), compressor);
pad.chain(reverb, new Tone.Gain(0.2), compressor);

compressor.chain(Tone.Destination);

let activeTonic = "A";
let activeScale = "major";
const getScale = () => teoria.note(`${activeTonic}1`).scale(activeScale);

let padNoteIndex = 0;
const getPadNoteIndex = () => padNoteIndex;

const backgroundLoop = new Tone.Loop((time) => {
  const noteIndex = getPadNoteIndex();
  const scale = getScale();
  pad.triggerAttack(scale.get(noteIndex + 1).toString());
}, 2).start(0);

const stage = new Konva.Stage({
  container: "canvas-container",
  width: width,
  height: height,
});

const activeNotes = [0, 0, 0, 0, 0, 0, 0, 0];
const layer = new Konva.Layer();
stage.add(layer);

const createControls = () => {
  const tonicSelect = $("<select id='select-tonic' />");
  for (let i in TONICS) {
    tonicSelect.append($(`<option />`).html(TONICS[i]));
  }

  const scaleSelect = $("<select id='select-scale' />");
  for (let i in SCALES) {
    scaleSelect.append($(`<option />`).html(SCALES[i]));
  }

  tonicSelect.on("change", ({ currentTarget: { value } }) => {
    activeTonic = value;
    reset();
  });
  scaleSelect.on("change", ({ currentTarget: { value } }) => {
    activeScale = value.replace(" ", "").toLowerCase();
    reset();
  });

  $("#controls").append(tonicSelect);
  $("#controls").append(scaleSelect);
};

const drawStep = (stepIndex) => {
  const numSteps = 8;
  const stepX =
    (stepIndex * (width * 0.8)) / numSteps + (width * 0.8) / numSteps / 2 + 80;
  const stepY = 60;
  const stepHeight = height / 3;

  const defaultAttrs = {
    x: stepX - 1,
    y: stepY,
    width: 2,
    height: stepHeight,
    fill: "#444",
    hitFunc: function (context) {
      context.beginPath();
      context.rect(-20, 0, 42, stepHeight);
      context.closePath();
      context.fillStrokeShape(this);
    },
  };

  const rect = new Konva.Rect(defaultAttrs);

  rect.on("mouseover", function ({ evt }) {
    const { clientY } = evt;

    const volumePercent = Math.abs(clientY - (stepY + stepHeight)) / stepHeight;
    const volume = volumePercent * 10 - 10;
    const noteIndex = activeNotes[stepIndex];

    const newWidth = volumePercent * 20 + 5;
    rect.setAttrs({
      fill: "white",
      width: newWidth,
      x: stepX - newWidth / 2,
      hitFunc: function (context) {
        context.beginPath();
        const x1 = -21 + newWidth / 2;
        const x2 = 43 - newWidth / 20;
        context.rect(x1, 0, x2, stepHeight);
        context.closePath();
        context.fillStrokeShape(this);
      },
    });

    synth.volume.value = volume;
    synth.triggerAttackRelease(
      getScale()
        .get(noteIndex + 1)
        .toString(),
      getIsMousePressed() ? 10 : 0.2
    );
    layer.draw();
  });

  rect.on("mouseout", function () {
    rect.setAttrs(defaultAttrs);
    synth.triggerRelease();
    layer.draw();
  });

  layer.add(rect);

  const circles = [];
  const notes = getScale().notes();
  notes.forEach((note, i) => {
    const y = height - (30 * i + height / 3) - 40;
    const circle = new Konva.Circle({
      x: stepX,
      y,
      radius: 10,
      fill: activeNotes[stepIndex] === i ? "white" : "#444",
    });

    circle.on("click", () => {
      circles.forEach((circle) => {
        circle.setAttrs({ fill: "#444" });
      });
      circle.setAttrs({ fill: "white" });
      activeNotes[stepIndex] = i;

      layer.draw();
    });
    circle.on("mouseenter", () => {
      stage.container().style.cursor = "pointer";
    });

    circle.on("mouseleave", () => {
      stage.container().style.cursor = "default";
    });
    layer.add(circle);
    circles.push(circle);
  });
  var text = new Konva.Text({
    x: stepX - 5,
    y: height - height / 3 - 20,
    text: KEY_CONTROLS[stepIndex],
    fontSize: 15,
    fontFamily: "Roboto Mono",
    fill: "#666",
  });
  layer.add(text);

  // layer.toggleHitCanvas();
  layer.draw();
};

const drawPadControl = () => {
  const notes = getScale().notes();
  const rects = [];
  const x = 100;

  notes.forEach((note, i) => {
    const y = height - (30 * i + height / 3) - 40;
    const rect = new Konva.Rect({
      x: x - 50,
      y,
      width: 20,
      height: 20,
      offset: { x: 10, y: 10 },
      fill: padNoteIndex === i ? "white" : "#666",
    });
    rect.on("mouseenter", () => {
      stage.container().style.cursor = "pointer";
    });

    rect.on("mouseleave", () => {
      stage.container().style.cursor = "default";
    });
    const text = new Konva.Text({
      x: x - 90,
      y: y - 5,
      text: i + 1,
      fontSize: 15,
      fontFamily: "Roboto Mono",
      fill: "#666",
    });
    rect.on("click", () => {
      rects.forEach((rect) => {
        rect.setAttrs({ fill: "#666" });
      });
      rect.setAttrs({ fill: "white" });
      padNoteIndex = i;

      layer.draw();
    });

    var anim = new Konva.Animation(function (frame) {
      if (padNoteIndex === i && Tone.Transport.state == "started") {
        var scale = Math.sin((frame.time * 2 * Math.PI) / 1000) + 2;
        rect.scale({ x: 1 + scale / 9, y: 1 + scale / 9 });
      } else {
        rect.scale({ x: 1, y: 1 });
      }
    }, layer);
    anim.start();

    layer.add(rect);
    layer.add(text);
    rects.push(rect);
  });

  layer.draw();
};

const drawSteps = () => {
  for (let i = 0; i < activeNotes.length; i++) {
    drawStep(i);
  }
};

const reset = () => {
  layer.destroyChildren();
  drawSteps();
  drawPadControl();
};

const incrementNote = (stepIndex) => {
  let newIndex = activeNotes[stepIndex] + 1;
  newIndex = newIndex % getScale().notes().length;
  activeNotes[stepIndex] = newIndex;
  reset();
};

setBackgroundNote = (noteIndex) => {
  padNoteIndex = noteIndex;
  reset();
};
$(document).on("mousedown", (e) => {
  isMousePressed = true;
});
$(document).on("mouseup", (e) => {
  isMousePressed = false;
});
$(document).on("keypress", (e) => {
  const { which } = e;
  console.log(which);
  switch (which) {
    case 97:
      incrementNote(0);
      break;
    case 115:
      incrementNote(1);
      break;
    case 100:
      incrementNote(2);
      break;
    case 102:
      incrementNote(3);
      break;
    case 103:
      incrementNote(4);
      break;
    case 104:
      incrementNote(5);
      break;
    case 106:
      incrementNote(6);
      break;
    case 107:
      incrementNote(7);
      break;
    case 49:
      setBackgroundNote(0);
      break;
    case 50:
      setBackgroundNote(1);
      break;
    case 51:
      setBackgroundNote(2);
      break;
    case 52:
      setBackgroundNote(3);
      break;
    case 53:
      setBackgroundNote(4);
      break;
    case 54:
      setBackgroundNote(5);
      break;
    case 55:
      setBackgroundNote(6);
      break;
    case 56:
      setBackgroundNote(7);
      break;
    case 32:
      Tone.Transport.toggle();
      break;
    default:
      break;
  }
});

$(document).ready(function () {
  createControls();
  drawSteps();
  drawPadControl();
});
