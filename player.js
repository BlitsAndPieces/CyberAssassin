var Player = function(game, gravity, chipsGroup) {
  
  // constants
  
  // Acceleration; player accelerates left/right
  var accel = 10;
  
  // Deceleration; when no left/right input player decelerates at this rate
  var decel = accel * 1.5;
  
  // Initial speed when at rest or moving in opposite direction
  var minSpeed = 200;

  // Max for moving left/right  
  var maxSpeed = 500;
  
  // Multiplier of gravity of jump force
  var jumpMultiplier = -20;
  
  // Speed for pushing off walls
  var pushForce = 700;
  // Also jump up a little when pushing off walls
  var pushJumpMultiplier = -20;
  
  // Maximum speed in freefall
  var maxYVel = 600;
  
  // Maximum speed when sliding against wall
  var maxSlideVel = 400;
  
  // Velocities when taking hit from a bullet
  var hitYMultiplier = -10;
  var hitXVel = 200;
  
  
  var dieSound = game.add.audio('boom');
  var walkSound = game.add.audio('steps');
  var pushSound = game.add.audio('swoosh');
  var jumpSound = game.add.audio('jump');
  var scrapeSound = game.add.audio('scrape');
  var ledgeSound = game.add.audio('ledge');
  
  var scrapeEmitter = game.add.emitter(0, 0, 200);
  scrapeEmitter.makeParticles('spark');
  scrapeEmitter.gravity = gravity * 0.2;
  
  
  // Note: need to track running speed manually because ground collisions
  // slow the player down
  this.speed = 0;
  
  this.sprite = game.add.sprite(32, 150, 'player');
  this.sprite.anchor.x = 0.5;
  this.sprite.body.width -= 28;
  this.sprite.body.x += 14;
  //  Player physics properties
  this.sprite.body.gravity.y = gravity;
  this.sprite.body.collideWorldBounds = true;
  // Animations
  this.sprite.animations.add('left', [8 - 1, 8 - 2, 8 - 3, 8 - 4, 8 - 5, 8 - 6], 15, true);
  this.sprite.animations.add('right', [9 + 1, 9 + 2, 9 + 3, 9 + 4, 9 + 5, 9 + 6], 15, true);
  this.sprite.animations.add('jumpleft', [8 - 7, 8 - 8], 4, false);
  this.sprite.animations.add('jumpright', [9 + 7, 9 + 8], 4, false);
  var scrapeFrame = { left: 9 + 8, right: 8 - 8 };
  this.sprite.animations.add('standleft', [8], 10, false);
  this.sprite.animations.add('standright', [9], 10, false);
  this.touchState = {};
  
  // (h)orizontal, (v)ertical or (c)limbing
  // In horizontal mode, player walks along floors in building interiors
  // In vertical mode, player pushes off sides of buildings
  // In climbing mode, player is tweening to climb so no collisions or movements allowed
  this.moveMode = 'v';
  
  this.lastDir = 'left';
  
  // Melee attack sprite
  // Normally inactive, activated using melee key
  this.meleeSprite = game.add.sprite(0, 0, 'melee');
  var meleeAnimation = this.meleeSprite.animations.add('play');
  meleeAnimation.killOnComplete = true;
  this.meleeSprite.anchor.setTo(0.5, 0.5);
  this.meleeSprite.kill();
  var meleeSound = game.add.audio('swish');
  // Have a cooldown so you can't melee too often
  var meleeCooldown = 10;
  this.meleeCounter = 0;

  this.sprite.health = maxHealth;
  this.healthIndicator = new HealthIndicator(game, this.sprite.x, this.sprite.y);
  this.healthIndicator.show(this.sprite);

  // Move left, right, jump on ground
  // When jumping, cannot change x velocity
  this.handleInput = function(game, cursors) {
    // Update what touching state the player is in
    var newTouch = this.sprite.body.touching;
    if (newTouch.left || newTouch.right || newTouch.down) {
      this.touchState = {
        left : newTouch.left,
        right : newTouch.right,
        down : newTouch.down
      };
    }

    if (this.touchState.left || this.touchState.right) {
      // Cancel normal movement
      this.speed = 0;

      // sliding against building
      this.sprite.animations.stop();
      this.sprite.frame = scrapeFrame[this.lastDir];
      this.sprite.body.velocity.y = Math.min(this.sprite.body.velocity.y, maxSlideVel);
      
      // Allow player to do two moves when touching a wall:
      // - jump to left/right wall only if they were touching the opposite wall
      // - nudge into the wall they are touching so they can enter rooms on their side
      if (this.touchState.left) {
        if (cursors.right.isDown) {
          this.sprite.body.velocity.x = pushForce;
          this.sprite.body.velocity.y += pushJumpMultiplier * gravity;
          this.sprite.animations.play('jumpright');
          this.touchState.left = false;
          this.lastDir = 'right';
          pushSound.play();
          this.speed = maxSpeed;
        } else if (cursors.left.isDown) {
          //this.sprite.body.velocity.x = -100;
        }
      } else if (this.touchState.right) {
        if (cursors.left.isDown) {
          this.sprite.body.velocity.x = -pushForce;
          this.sprite.body.velocity.y += pushJumpMultiplier * gravity;
          this.sprite.animations.play('jumpleft');
          this.touchState.right = false;
          this.lastDir = 'left';
          pushSound.play();
          this.speed = -maxSpeed;
        } else if (cursors.right.isDown) {
          //this.sprite.body.velocity.x = 100;
        }
      }
      
      if (this.sprite.body.velocity.x === 0 && !scrapeSound.isPlaying) {
        scrapeSound.play('', 0, 0.2, true);
      }

      // Sparks
      if (scrapeSound.isPlaying) {
        scrapeEmitter.x = this.sprite.x + (this.touchState.left ? -this.sprite.body.width / 2 : this.sprite.body.width / 2);
        scrapeEmitter.y = this.sprite.y + this.sprite.height / 2;
        scrapeEmitter.start(true, 300, null, 3);
        if (this.touchState.left) {
          scrapeEmitter.setXSpeed(0, 50.0);
        } else {
          scrapeEmitter.setXSpeed(-50, 0);
        }
      }
    } else if (newTouch.down) {
      this.sprite.body.velocity.x = 0;
      
      var move = function(player, dir) {
        var sign = (dir === 'left' ? -1 : 1);
        // Initial speed
        if (player.speed * sign <= 0 ||
            Math.abs(player.speed) < minSpeed) {
          player.speed = minSpeed * sign;
        } else {
          // Accelerate
          player.speed += accel * sign;
          // Cap max speed
          if (Math.abs(player.speed) > maxSpeed) {
            player.speed = maxSpeed * sign;
          }
        }
        player.sprite.animations.play(dir);
        player.lastDir = dir;
      };
      if (cursors.left.isDown) {
        move(this, 'left');
      } else if (cursors.right.isDown) {
        move(this, 'right');
      } else {
        //  Stand still
        this.sprite.animations.play('stand' + this.lastDir);
        // Slow down
        var sign = this.speed < 0 ? -1 : 1;
        if (Math.abs(this.speed) < decel) {
          this.speed = 0;
        } else {
          this.speed -= decel * sign;
        }
        // Stop if below min speed
        // This is to stop falling too far down a hole
        if (Math.abs(this.speed) < minSpeed) {
          this.speed = 0;
        }
      }
      this.sprite.body.velocity.x = this.speed;
      
      if (this.speed !== 0 && !walkSound.isPlaying) {
        walkSound.play('', 0, 0.8, true);
      }

      //  Allow the player to jump if they are touching the ground.
      if (cursors.up.isDown) {
       this.sprite.body.velocity.y = this.sprite.body.gravity.y * jumpMultiplier;
       jumpSound.play();
       this.sprite.animations.play('jump' + this.lastDir);
      }
    }
    
    if (!newTouch.down || this.speed === 0) {
      walkSound.stop();
    }
    if ((!this.touchState.left && !this.touchState.right) ||
        this.sprite.body.velocity.x !== 0 ||
        newTouch.down) {
      scrapeSound.stop();
    }

    // Check for melee
    if (game.input.keyboard.isDown(Phaser.Keyboard.Z)) {
      if (this.meleeCounter <= 0) {
        this.melee();
      }
    } else {
      this.meleeCounter = 0;
    }
  };
  
  this.melee = function() {
    var pos = {
      x: this.sprite.x,
      y: this.sprite.y + this.sprite.height / 2
    };
    if (this.lastDir === 'left') {
      pos.x -= this.sprite.width / 2;
    } else {
      pos.x += this.sprite.width / 2;
    }
    this.meleeSprite.reset(pos.x, pos.y, 1);
    meleeAnimation.play('play');
    meleeSound.play();
    this.meleeCounter = meleeCooldown;
    // Slow down when attacking
    this.speed /= 2;
  };
  
  this.chipCompass = new Compass(game);
  this.update = function(chipsGroup, exit) {
    // Cap Y velocity so we don't fall so fast
    this.sprite.body.velocity.y = Math.min(this.sprite.body.velocity.y, maxYVel);
    
    // Move the health indicator
    this.healthIndicator.setPosition(this.sprite);
    
    // Update the compass
    this.chipCompass.update(this.sprite, chipsGroup, exit);
    
    this.meleeCounter--;
  };
  
  // Take a hit from a bullet
  // Taking hits launches the player in the direction of the bullet
  this.takeHit = function(bulletVelocity) {
    this.sprite.body.velocity.y = hitYMultiplier * gravity;
    this.sprite.body.velocity.x = bulletVelocity.x < 0 ? -hitXVel : hitXVel;
    // Reset speed to prevent anomalous movement
    this.speed = 0;
    // Reduce health
    this.sprite.damage(1);
    this.healthIndicator.show(this.sprite);
    this.sprite.animations.play('jump' + this.lastDir);
  };
  
  this.climbCounter = 0;
  this.climbDuration = 1000;
  this.climbStart = {x: 0, y: 0};
  this.climbEnd = {x: 0, y: 0};
  this.climbJumpSoundPlayed = false;
  this.startClimb = function(ledge, point, duration) {
    this.moveMode = 'c';
    this.climbCounter = 0;
    this.climbDuration = duration;
    this.climbStart = {x: this.sprite.body.x, y: this.sprite.body.y};
    this.climbEnd = point.add(0, -this.sprite.body.height / 2);
    this.speed = 0;
    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;
    this.sprite.body.allowGravity = false;
    ledgeSound.play();
    this.climbJumpSoundPlayed = false;
    this.sprite.animations.play('jump' + this.lastDir);
  };
  this.climb = function() {
    var distance = Phaser.Easing.Back.InOut(this.climbCounter / this.climbDuration);
    if (this.climbCounter >= this.climbDuration) {
      // Set to end to make sure player ends up on top
      this.sprite.body.x = this.climbEnd.x;
      this.sprite.body.y = this.climbEnd.y;
      this.moveMode = 'h';
      this.sprite.body.allowGravity = true;
    } else {
      this.climbCounter++;
      this.sprite.body.x = distance * this.climbEnd.x + (1 - distance) * this.climbStart.x;
      this.sprite.body.y = distance * this.climbEnd.y + (1 - distance) * this.climbStart.y;
    }
    if (this.climbCounter * 4 > this.climbDuration && !this.climbJumpSoundPlayed) {
      jumpSound.play();
      this.climbJumpSoundPlayed = true;
    }
  };
  
  this.flyTowards = function(body, flyMultiplier) {
    this.sprite.body.velocity.x = (body.x - this.sprite.body.x) * flyMultiplier;
    this.sprite.body.velocity.y = (body.y - this.sprite.body.y) * flyMultiplier;
    // Cap velocity
    this.sprite.body.velocity.x = Math.min(10000, Math.max(-10000, this.sprite.body.velocity.x));
    this.sprite.body.velocity.y = Math.min(5000, Math.max(-5000, this.sprite.body.velocity.y));
  };
  
  this.die = function() {
    dieSound.play();
    this.freeze();
  };
  
  this.reset = function() {
    this.sprite.reset(32, 150, maxHealth);
    this.sprite.body.allowGravity = true;
    this.speed = 0;
    this.healthIndicator.show(this.sprite);
  };
  
  this.freeze = function() {
    walkSound.stop();
    scrapeSound.stop();
    this.sprite.animations.stop();
    this.sprite.body.velocity.x = 0;
    this.sprite.body.velocity.y = 0;
    this.sprite.body.allowGravity = false;
  };
};