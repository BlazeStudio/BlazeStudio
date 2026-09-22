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

  ps = new ParticleSystem(settings.numberofparticles, settings.numberofattractors, settings.numberofrotators);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
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
