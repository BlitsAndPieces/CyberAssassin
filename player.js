var Player = function(game, gravity) {
  
  // constants
  
  // Speed for moving left/right
  var speed = 250;
  
  // Multiplier of gravity of jump force
  var jumpMultiplier = -20;
  
  // Speed for pushing off walls
  var pushForce = 500;
  
  // Maximum speed in freefall
  var maxYVel = 800;
  
  // Maximum speed when sliding against wall
  var maxSlideVel = 600;
  
  
  this.sprite = game.add.sprite(32, 150, 'player');
  //  Player physics properties
  this.sprite.body.gravity.y = gravity;
  this.sprite.body.collideWorldBounds = true;
  //  Our two animations, walking left and right.
  this.sprite.animations.add('left', [0, 1, 2, 3], 10, true);
  this.sprite.animations.add('right', [5, 6, 7, 8], 10, true);
  this.touchState = {};

  // Move left, right, jump on ground
  // When jumping, cannot change x velocity
  this.handleInput = function(cursors) {
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
      // sliding against building
      this.sprite.animations.stop();
      this.sprite.frame = 4;
      this.sprite.body.velocity.y = Math.min(this.sprite.body.velocity.y, maxSlideVel);
      
      // Allow player to jump to left/right wall only if they were touching
      // the opposite wall
      if (cursors.right.isDown && this.touchState.left) {
        this.sprite.body.velocity.x = pushForce;
        this.sprite.animations.play('right');
        this.touchState.left = false;
      } else if (cursors.left.isDown && this.touchState.right) {
        this.sprite.body.velocity.x = -pushForce;
        this.sprite.animations.play('left');
        this.touchState.right = false;
      }
    } else if (newTouch.down) {
      this.sprite.body.velocity.x = 0;
      if (cursors.left.isDown) {
        //  Move to the left
        this.sprite.body.velocity.x = -speed;
        this.sprite.animations.play('left');
      } else if (cursors.right.isDown) {
        //  Move to the right
        this.sprite.body.velocity.x = speed;
        this.sprite.animations.play('right');
      } else {
        //  Stand still
        this.sprite.animations.stop();
        this.sprite.frame = 4;
      }

      //  Allow the player to jump if they are touching the ground.
      if (cursors.up.isDown) {
       this.sprite.body.velocity.y = this.sprite.body.gravity.y * jumpMultiplier;
      }
    }
    
    // Cap Y velocity so we don't fall so fast
    this.sprite.body.velocity.y = Math.min(this.sprite.body.velocity.y, maxYVel);
  };
};