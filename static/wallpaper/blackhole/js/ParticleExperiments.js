///////////////////////////////////////////////// Globals ////////////////////////////////////////////////////////////////////////////
var ps;

// Defaults match the customized property values from the Workshop item's
// project.json (the ones Wallpaper Engine itself would apply on load) rather
// than the sketch's own out-of-the-box values — this is meant to look like
// the actual configured wallpaper, not a generic demo of it.
var settings = {
  // General Settings
  backgroundcolor:          "#0a0a0a",
  fadestrength:             0.4,
  fps:                      30,

  // Particle properties
  particlecolor:            "#ffffff",
  numberofparticles:        1500,
  particlesize_min:         1,
  particlesize_max:         1,
  particlespeed_min:        0.1,
  particlespeed_max:        1,
  particlehistory_length:   2,
  particlerandommovefactor: 0,

  // Attractor properties
  numberofattractors:       0,
  attractorsize_min:        10,
  attractorsize_max:        50,
  attractorspeed_min:       0,
  attractorspeed_max:       2,
  attractorstrengthfactor:  0.5,
  attractorcolor:           "#000000",

  // Rotator properties
  numberofrotators:         1,
  rotatorsize:              75,
  rotatorspeed:             0.0,
  rotatorcolor:             "#000000",
  rotatorrandomdirection:   false,
  rotatordirection:         true,
  rotatorrandommovefactor:  0.2,
  rotatorrotationoffset:    0.2,
  rotatoraudiosizefactor:   0,
}

// The sketch's sizes/speeds (rotatorsize, particle size & speed) are all
// absolute pixel values, tuned for Wallpaper Engine's assumption of a fixed
// monitor resolution. Embedded in an iframe that can be any size, those
// absolute values stayed exactly the same pixel count regardless of the
// canvas's actual dimensions — so the black hole and particle motion looked
// proportionally bigger/faster on a small window and smaller/slower on a
// big one, instead of scaling with it. applyResponsiveScale() rescales them
// by the ratio between the actual canvas area and this reference area
// (1920x1080, a common desktop resolution) every time the canvas resizes,
// so the whole composition's proportions stay consistent at any size.
var REFERENCE_WIDTH = 1920;
var REFERENCE_HEIGHT = 1080;
var BASE_ROTATOR_SIZE = settings.rotatorsize;
var BASE_PARTICLESPEED_MIN = settings.particlespeed_min;
var BASE_PARTICLESPEED_MAX = settings.particlespeed_max;

function applyResponsiveScale() {
  var scaleFactor = Math.sqrt((windowWidth * windowHeight) / (REFERENCE_WIDTH * REFERENCE_HEIGHT));
  settings.rotatorsize = BASE_ROTATOR_SIZE * scaleFactor;
  settings.particlespeed_min = BASE_PARTICLESPEED_MIN * scaleFactor;
  settings.particlespeed_max = BASE_PARTICLESPEED_MAX * scaleFactor;
}

var wp_audio_array = [0];

function getAudioMagnitude(){
  return getAudioMagnitudeRange(0, wp_audio_array.length);
}
function getAudioMagnitudeRange(from, to){
  var sum = 0;
  for(var i = from; i < to && i < wp_audio_array.length; i++){
    sum += wp_audio_array[i];
  }
  return sum / (to - from);
}

/////////////////////////////////////////////////// p5js Callbacks ///////////////////////////////////////////////////////////////////
function setup() {
  frameRate(settings.fps);
  // Wallpaper Engine renders straight to the desktop, so the original sketch
  // sized the canvas to the monitor's own resolution (displayWidth/Height).
  // Embedded in a page instead, it needs to fill whatever box it's actually
  // given — its own window/iframe — so it uses windowWidth/Height plus
  // windowResized() below instead.
  createCanvas(windowWidth, windowHeight);
  background(settings.backgroundcolor);
  applyResponsiveScale();

  ps = new ParticleSystem(settings.numberofparticles, settings.numberofattractors, settings.numberofrotators);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  applyResponsiveScale();
}

function draw() {
  //Fade out the previous frame
  var backgroundcolor = color(settings.backgroundcolor);
  backgroundcolor.setAlpha(int(settings.fadestrength * 255));
  fill(backgroundcolor);
  rect(0, 0, width, height);

  // Tick the simulation
  ps.tick(deltaTime);
}

/////////////////////////////////////////////// Wallpaper Engine Callbacks /////////////////////////////////////////////////////////
window.wallpaperPropertyListener = {
  applyUserProperties: function(properties) {
    console.log(properties);

    if(properties.backgroundcolor){
      settings.backgroundcolor = wallpaperEngineColorConversion(properties.backgroundcolor.value);
    }

    if(properties.particlecolor){
      settings.particlecolor = wallpaperEngineColorConversion(properties.particlecolor.value);
    }

    if(properties.centercolor){
      settings.rotatorcolor = wallpaperEngineColorConversion(properties.centercolor.value);
      settings.attractorcolor = wallpaperEngineColorConversion(properties.centercolor.value);
    }

    if(properties.numberofparticles){
      settings.numberofparticles = properties.numberofparticles.value;
      setup();
    }

    if(properties.particlerandommovefactor){
      settings.particlerandommovefactor = properties.particlerandommovefactor.value;
    }

    if(properties.fadestrength){
      settings.fadestrength = properties.fadestrength.value;
    }

    if(properties.rotatorsize){
      settings.rotatorsize = properties.rotatorsize.value;
    }

    if(properties.rotatordirection){
      settings.rotatordirection = properties.rotatordirection.value;
    }

    if(properties.rotatorrotationoffset){
      settings.rotatorrotationoffset = properties.rotatorrotationoffset.value;
    }

    if(properties.rotatorrandommovefactor){
      settings.rotatorrandommovefactor = properties.rotatorrandommovefactor.value;
    }


  },

  applyGeneralProperties: function(properties) {
    console.log(properties);
    if (properties.fps) {
        settings.fps = properties.fps;
    }
    setup();
  },
};

function wallpaperAudioListener(audio) {
  wp_audio_array = audio;
}

// Only real inside Wallpaper Engine itself — running this sketch in a plain
// browser tab/iframe (as here) has no such API, so calling it unconditionally
// would throw on load.
if (window.wallpaperRegisterAudioListener) {
  window.wallpaperRegisterAudioListener(wallpaperAudioListener);
}
