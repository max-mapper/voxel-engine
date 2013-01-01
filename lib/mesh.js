var Mesh = (function() {

  function Mesh(data, scaleFactor) {
    this.data = data
    var w = scaleFactor || 10
    var geometry  = new THREE.Geometry();    
    
    var mesher = voxel.meshers.greedy
    var result = mesher( data.voxels, data.dims )
    this.meshed = result

    geometry.vertices.length = 0
    geometry.faces.length = 0

    for (var i = 0; i < result.vertices.length; ++i) {
      var q = result.vertices[i]
      geometry.vertices.push(new THREE.Vector3(q[0]*w, q[1]*w, q[2]*w))
    } 
    
    for (var i = 0; i < result.faces.length; ++i) {
      var q = result.faces[i]
      if (q.length === 5) {
        var f = new THREE.Face4(q[0], q[1], q[2], q[3])
        f.color = new THREE.Color(q[4])
        f.vertexColors = [f.color,f.color,f.color,f.color]
        geometry.faces.push(f)
      } else if (q.length == 4) {
        var f = new THREE.Face3(q[0], q[1], q[2])
        f.color = new THREE.Color(q[3])
        f.vertexColors = [f.color,f.color,f.color]
        geometry.faces.push(f)
      }
    }
    
    geometry.computeFaceNormals()

    geometry.verticesNeedUpdate = true
    geometry.elementsNeedUpdate = true
    geometry.normalsNeedUpdate = true

    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()

    var bb = geometry.boundingBox

    var material  = new THREE.MeshNormalMaterial()
    var surfaceMesh  = new THREE.Mesh( geometry, material )

    surfaceMesh.doubleSided = false
    
    var wirematerial = new THREE.MeshBasicMaterial({
        color : 0xffffff
      , wireframe : true
    });
    wiremesh = new THREE.Mesh(geometry, wirematerial);
    wiremesh.doubleSided = true;
    
    this.wireMesh = wiremesh
    this.surfaceMesh = surfaceMesh
  }
  
  Mesh.prototype.addToScene = function(scene) {
    // scene.add( this.surfaceMesh )
    scene.add( this.wireMesh )
  }
  
  Mesh.prototype.setPosition = function(x, y, z) {
    this.wireMesh.position = new THREE.Vector3(x, y, z)
  }

  return Mesh

})()
;
