class Vector {
    constructor(coordinates){
      this.x = coordinates[0];
      this.y = coordinates[1];     
    }
  
    static randomUnitVector(){
      var angle = Math.random() * 2 * Math.PI;
      return new Vector([Math.cos(angle), Math.sin(angle)]);
    }
  
    normalized(){
      var magnitude = this.magnitude();
      return new Vector([this.x / magnitude, this.y / magnitude]);
    }
  
    magnitude(){
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
  }
  
  class Particle {
    constructor() {
      this.init();
    }

    init(){
      this.x = random(0, width);
      this.y = random(0, height);
      this.r = random(settings.particlesize_min, settings.particlesize_max);
      this.direction = Vector.randomUnitVector();
      this.speed = random(settings.particlespeed_min, settings.particlespeed_max);
      this.color = color(settings.particlecolor);
  
      this.x_history = [];
      this.y_history = [];
      this.history_length = settings.particlehistory_length;
    }
  
    // creation of a particle.
    drawParticle() {
      noStroke();
  
      fill(this.color);
      circle(this.x, this.y, this.r);
  
      // drawing the history of the particle.
      var last_x = this.x_history[0];
      var last_y = this.y_history[0];
  
      for (var i = 1; i < this.x_history.length; i++) {
        // draw a line from the last position to the current position.
        stroke(this.color);
        strokeWeight(1);
        line(last_x, last_y, this.x_history[i], this.y_history[i]);
        last_x = this.x_history[i];
        last_y = this.y_history[i];
      }
      line(last_x, last_y, this.x, this.y);
    }
  
    // setting the particle in motion.
    moveParticle() {
      this.x_history.push(this.x);
      this.y_history.push(this.y);
      if (this.x_history.length > this.history_length) {
        this.x_history.shift();
      }
      if (this.y_history.length > this.history_length) {
        this.y_history.shift();
      }
  
      if (this.x < 0 ||        
          this.x > width ||        
          this.y < 0 ||        
          this.y > height)
      {
        this.init();
      }
        
        
  
      let audioMagnitude = 1 + getAudioMagnitudeRange(64,128) * 20.0;
    
      this.x+=this.direction.x * this.speed * audioMagnitude;
      this.y+=this.direction.y * this.speed * audioMagnitude;
      
      this.x += random(-audioMagnitude, audioMagnitude) * settings.particlerandommovefactor;
      this.y += random(-audioMagnitude, audioMagnitude) * settings.particlerandommovefactor;
  
    }
  }
  
  class Attractor {
    constructor() {
      this.x = random(0, width);
      this.y = random(0, height);
      this.r = random(settings.attractorsize_min, settings.attractorsize_max);
      this.strength = this.r * settings.attractorstrengthfactor;
      this.direction = Vector.randomUnitVector();
      this.speed = random(settings.attractorspeed_min, settings.attractorspeed_max);
      this.color = color(settings.attractorcolor);
    }
  
    // creation of an attractor.
    drawAttractor() {
      noStroke();
  
      fill(this.color);
      circle(this.x, this.y, this.r);
    }
  
    // setting the attractor in motion.
    moveAttractor() {
      if (this.x < 0)
        this.direction.x = abs(this.direction.x);
      if (this.x > width)
        this.direction.x = -abs(this.direction.x);
      if (this.y < 0)
        this.direction.y = abs(this.direction.y);
      if (this.y > height)
        this.direction.y = -abs(this.direction.y);
  
      let audioMagnitude = getAudioMagnitudeRange(0,20) * 50.0;
      
      this.x+=this.direction.x * this.speed * audioMagnitude;
      this.y+=this.direction.y * this.speed * audioMagnitude;
  
      audioMagnitude = 1 + audioMagnitude * 2;
  
      this.x += random(-audioMagnitude, audioMagnitude);
      this.y += random(-audioMagnitude, audioMagnitude);
    }
  
    // manipulate particles with the attractor.
    attractParticles(particles) {
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var d = Math.sqrt((p.x - this.x)**2+ (p.y - this.y)**2);
        
        // Move particles towards the attractor according to the law of gravitation.
        if (d < this.r) {
          //p.direction = new Vector([p.direction.x - (this.x - p.x) * this.strength / d**2, p.direction.y - (this.y - p.y) * this.strength / d**2]);
            particles[i] = new Particle();
        }
        else {
          p.direction = new Vector([p.direction.x + (this.x - p.x) * this.strength / d**2, p.direction.y + (this.y - p.y) * this.strength / d**2]);
        }  
      }
    }
  }
  
  class Rotator {
    constructor() {


      this.x_min = width/2 - height/4;
      this.x_max = width/2 + height/4;
      this.y_min = height/2 - height/4;
      this.y_max = height/2 + height/4; 
  
      this.x = width/2;
      this.y = height/2;      
      console.log(this.x);
      console.log(this.y);

      this.x_offset = 0;
      this.y_offset = 0;
      
      this.direction = Vector.randomUnitVector();
      this.speed = settings.rotatorspeed;
      this.color = color(settings.rotatorcolor);
      if(settings.rotatorrandomdirection == true)
        this.turndirection = random(0,1) > 0.5 ? 1 : -1;
      else
        this.turndirection = settings.rotatordirection ? 1 : -1;

    }
  
    drawRotator() {
      noStroke();   
      fill(this.color);
      circle(this.x + this.x_offset, this.y + this.y_offset, this.getRadius()*2);
    }
  
    moveRotator() {
      if (this.x < this.x_min)
        this.direction.x = abs(this.direction.x);
      if (this.x > this.x_max)
        this.direction.x = -abs(this.direction.x);
      if (this.y < this.y_min)
        this.direction.y = abs(this.direction.y);
      if (this.y > this.y_max)
        this.direction.y = -abs(this.direction.y);
  
      let audioMagnitude = getAudioMagnitudeRange(0,20) * 50.0;
      
      this.x+=this.direction.x * settings.rotatorspeed * audioMagnitude;
      this.y+=this.direction.y * settings.rotatorspeed * audioMagnitude;
  
      let magnitude_range = (1 + audioMagnitude * 2) * settings.rotatorrandommovefactor;

      let magnitude = random(0, magnitude_range);
      let angle = random(-Math.PI, Math.PI);
  

      if(this.speed > 0) {
        this.x += magnitude * cos(angle);
        this.y += magnitude * sin(angle);
      } else {
        this.x_offset = magnitude * cos(angle);
        this.y_offset = magnitude * sin(angle);
      }
    }
  
    rotateParticles(particles) {
      this.turndirection = settings.rotatordirection ? 1 : -1;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var d = Math.sqrt((p.x - this.x)**2+ (p.y - this.y)**2);
      

        
        var angle = atan2(p.y - this.y, p.x - this.x);

        let audioMagnitude = this.getAudioMagnitude();

        let radius = this.getRadius();
  
        if (d < radius) {
          particles[i] = new Particle();
        }
  
        if (this.turndirection == -1) {
          angle += Math.PI * (1/2 + 1/2 * settings.rotatorrotationoffset);
        }
        else if (this.turndirection == 1) {
          angle -= Math.PI * (1/2 + 1/2 * settings.rotatorrotationoffset);
        }
        else {
          angle += Math.PI;
        }
        
        p.direction.x = audioMagnitude * cos(angle);
        p.direction.y = 0.5 * audioMagnitude * sin(angle);
  
      }
    }

    getRadius(){
      let audioMagnitude = 1 + getAudioMagnitudeRange(0,40) * 10; 
      return settings.rotatorsize / 2 + audioMagnitude * settings.rotatoraudiosizefactor;
    }

    getAudioMagnitude(){
      return 1 + getAudioMagnitudeRange(0,40) * 100.0; 
    }
  
  
  }
  
  
  class ParticleSystem {
    constructor(no_particles, no_attractors, no_rotators) {
      this.particles = [];
      for (let i = 0; i<no_particles; i++) {
        this.particles.push(new Particle());
      }
  
      this.attractors = [];
      for (let i = 0; i<no_attractors; i++) {
        this.attractors.push(new Attractor());
      }
  
      this.rotators = [];
      for (let i = 0; i<no_rotators; i++) {
        this.rotators.push(new Rotator());
      }
  
    }
  
    tick() {
      for (let i = 0; i<this.particles.length; i++) {
        this.particles[i].moveParticle();
        this.particles[i].drawParticle();
      }
      
      for (let i = 0; i<this.attractors.length; i++) {
        this.attractors[i].moveAttractor();
        this.attractors[i].drawAttractor();
        this.attractors[i].attractParticles(this.particles);
      }
  
      for (let i = 0; i<this.rotators.length; i++) {
        this.rotators[i].moveRotator();
        this.rotators[i].drawRotator();
        this.rotators[i].rotateParticles(this.particles);
      }
  
    }
  }