var vec3 = require('gl-matrix').vec3,
    sigma = 0.00001;

function AABB(){
    this.x0 = 0;
    this.y0 = 0;
    this.z0 = 0;
    this.x1 = 0;
    this.y1 = 0;
    this.z1 = 0;
}

function clipSegmentSegment(a0, a1, b0, b1){
    // before
    if(b1 < a0) {
        return a0-b1;
    }
    if(b0 > a1){
        return a1-b0;
    }
    return 0.0;
}
function clipSegmentPoint(a0, a1, b0){
    if(b0 < a0) return a0-b0;
    if(b0 > a1) return a1-b0;
    return 0.0;
}

function Contact(resolution, penetration){
    this.resolution = resolution;
    this.penetration = penetration;
}

function CapsuleY(x, y, z, height, radius){
    this.x = x;
    this.y = y;
    this.z = z;
    this.halfHeight = height*0.5;
    this.y0 = y-this.halfHeight;
    this.y1 = y+this.halfHeight;
    this.radius = radius;
}
CapsuleY.prototype.setPosition = function(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.y0 = y-this.halfHeight;
    this.y1 = y+this.halfHeight;
};
CapsuleY.prototype.updateAABB = function(aabb) {
    aabb.x0 = this.x-this.radius;
    aabb.x1 = this.x+this.radius;
    aabb.y0 = this.y0-this.radius;
    aabb.y1 = this.y1+this.radius;
    aabb.z0 = this.z-this.radius;
    aabb.z1 = this.z+this.radius;
};
CapsuleY.prototype.translate = function(offset) {
    this.setPosition(this.x+offset[0], this.y+offset[1], this.z+offset[2]);
}; 
CapsuleY.prototype.collideAABB = function(aabb) {
    var xd = clipSegmentPoint(aabb.x0, aabb.x1, this.x);
    var yd = clipSegmentSegment(aabb.y0, aabb.y1, this.y0, this.y1);
    var zd = clipSegmentPoint(aabb.z0, aabb.z1, this.z);
    var d2 = xd*xd + yd*yd + zd*zd;
    if(d2 >= this.radius*this.radius*0.99){
        return null;
    }
    var d = Math.sqrt(d2);
    var penetration = this.radius-d;
    var resolution = vec3.fromValues(-xd/d*penetration, -yd/d*penetration, -zd/d*penetration);
    var c = new Contact(resolution, penetration);
    c.aabb = aabb;
    return c;
}; 

function fitAABBtoGrid (aabb, scale) {
    aabb.x0 -= aabb.x0%scale+scale;
    aabb.y0 -= aabb.y0%scale+scale;
    aabb.z0 -= aabb.z0%scale+scale;
    aabb.x1 += (scale-aabb.x1%scale)+scale;
    aabb.y1 += (scale-aabb.y1%scale)+scale;
    aabb.z1 += (scale-aabb.z1%scale)+scale;
}

function Player(game) {
    this.shape = new CapsuleY(0, 0, 0, 1.0, 0.75);
    this.game = game;
    this.aabb = new AABB();
    this.position = vec3.create();
    this.velocity = vec3.create();
    this.acceleration = vec3.create();
    this.hadContact = false;
}
var auxv3 = vec3.create();
Player.prototype.setPosition = function(pos) {
    vec3.set(pos, this.position[0], this.position[1], this.position[2])
    this.shape.setPosition(pos[0], pos[1], pos[2])
};
Player.prototype.tick = function(td) {
    this.velocity = vec3.add(vec3.create(), this.velocity, vec3.scale(vec3.create(), this.acceleration, td, auxv3));
    if(this.hadContact) {
        // assume a constant normal force of .1 COF ~.5
        var friction = 0.05,
            speed = vec3.length(this.velocity);
        friction = Math.min(speed, friction);
        this.velocity = vec3.scale(vec3.create(), this.velocity, 1-friction/speed);
    }
    this.position = vec3.add(vec3.create(), this.position, vec3.scale(vec3.create(), this.velocity, td, auxv3));

    var game = this.game,
        scale = game.cubeSize,
        aabb = this.aabb,
        voxel;

    // prepare AABB
    this.shape.setPosition(this.position[0], this.position[0], this.position[0]);
    this.shape.updateAABB(aabb);
    fitAABBtoGrid(aabb, scale);
    var voxels = [];
    for(var x = aabb.x0; x < aabb.x1; x+=scale) {
        for(var y = aabb.y0; y < aabb.y1; y+=scale) {
            for(var z = aabb.z0; z < aabb.z1; z+=scale) {
                if(game.voxelSource.getVoxel(x, y, z) > 0){
                    voxel = new AABB();
                    voxel.x0 = x;
                    voxel.y0 = y;
                    voxel.z0 = z;
                    voxel.x1 = x+scale;
                    voxel.y1 = y+scale;
                    voxel.z1 = z+scale;
                    voxels.push(voxel);
                }
            }
        }
    }

    var penetration = vec3.create(),
        contact = null, maxContact = null;
    // this is pretty excessive, but it gives quite smooth results
    for(var iterations = 0; iterations < 100; iterations++) {
        for(var i = 0; i < voxels.length; i++) {
            voxel = voxels[i];
            contact = this.shape.collideAABB(voxel);
            if(contact !== null && (maxContact === null || contact.penetration > maxContact.penetration)){
                maxContact = contact;
            }
        }
        if(maxContact !== null){
            this.shape.translate(vec3.scale(vec3.create(), maxContact.resolution, 0.1));
            maxContact = null;
        }
        else {
            break;
        }

    }

    this.hadContact = iterations > 0;

    this.velocity[0] += this.shape.x-this.position[0];
    this.velocity[1] += this.shape.y-this.position[1];
    this.velocity[2] += this.shape.z-this.position[2];

    this.position[0] = this.shape.x;
    this.position[1] = this.shape.y;
    this.position[2] = this.shape.z;
};
