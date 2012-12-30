var VoxelMesh = (function() {

  function VoxelMesh(data, scaleFactor) {
    var w = scaleFactor || 25
    var geometry  = new THREE.Geometry();    

    var mesher = voxel.meshers.greedy
    var result = mesher( data.voxels, data.dims )

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

    // Create surface mesh
    var material  = new THREE.MeshNormalMaterial()
    var surfaceMesh  = new THREE.Mesh( geometry, material )

    surfaceMesh.doubleSided = false

    // surfaceMesh.position.x = -(bb.max.x + bb.min.x) / 2.0
    // surfaceMesh.position.y = -(bb.max.y + bb.min.y) / 2.0
    // surfaceMesh.position.z = -(bb.max.z + bb.min.z) / 2.0
    
    this.surfaceMesh = surfaceMesh
  }
  
  VoxelMesh.prototype.addToScene = function(scene) {
    scene.add( this.surfaceMesh )
  }

  return VoxelMesh

})()
;
