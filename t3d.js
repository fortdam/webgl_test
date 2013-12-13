/*This would expose the "t3d" object to the global context*/

var t3d = {
  init: function(aCanvas) {
    try {
      glContext = aCanvas.getContext('experimental-webgl');
      glContext.viewport(0, 0, aCanvas.width, aCanvas.height);
    }
    catch (e) {
      var msg = 'Error creating WebGL context!: ' + e.toString();
      throw Error(msg);
    }

    return glContext;
  },
  
  startDraw: function(){
    if (null === glContext){
      throw Error("Must init before startDraw()");
    }

    glContext.clearColor(0.0, 0.0, 0.0, 1.0);
    glContext.clear(glContext.COLOR_BUFFER_BIT);
  },

  getGL: function() {
    return glContext;
  },

  //XXX the private items/function should be protected in someway
  glContext: null

};

function Matrix() {
  this.__mat = [1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1];
}

Matrix.prototype = {
  /*We use a normal array (with 16 elements) to represent a 4x4.__matrix*/

    __multiplyM: function(aMatrixA) {
      var orig = this.__mat.slice(0,16);

      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          this.__mat[i + j * 4] = 0;
          for (var k = 0; k < 4; k++) {
            this.__mat[i + j * 4] += aMatrixA[i + k * 4] * orig[k + j * 4];
          }
        }
      }
    },

    transpose: function() {
      for (var i = 0; i < 4; i++) {
        this.__mat[i * 4 + i] = this.__mat[i * 4 + i];

        for (var j = 0; j < i; j++) {
          this.__mat[i * 4 + j] = this.__mat[j * 4 + i];
          this.__mat[j * 4 + i] = this.__mat[i * 4 + j];
        }
      }

      return this;
    },

    frustum: function(aLeft, aRight, aBottom, aTop, aNear, aFar) {
      var m =
          [(2 * aNear) / (aRight - aLeft), 0, 0, 0,
           0, (2 * aNear) / (aTop - aBottom), 0, 0,
           (aRight + aLeft) / (aRight - aLeft), (aTop + aBottom) / (aTop - aBottom), -(aNear + aFar) / (aFar - aNear), -1,
           0, 0, (-2 * aNear * aFar) / (aFar - aNear), 0];

      this.__multiplyM(m);
      return this;
    },

    lookAt: function(aPosX, aPosY, aPosZ) {
      var m = [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    -aPosX, -aPosY, -aPosZ, 1];

      this.__multiplyM(m);
      return this;
    },

    translate: function(aDistX, aDistY, aDistZ) {
      var m = [1, 0, 0, 0,
                    0, 1, 0, 0,
                    0, 0, 1, 0,
                    aDistX, aDistY, aDistZ, 1];
      
      this.__multiplyM(m);
      return this;
    },

    __d2r: function(degree) {
      return (2 * 3.1415926 * degree) / 360;
    },

    rotate: function(aDegreeX, aDegreeY, aDegreeZ) {

      if (aDegreeX > 180 || aDegreeX < -180) {
        throw Error('aDegreeX is out of range:' + aDegreeX);
      }
      else if (aDegreeY > 180 || aDegreeY < -180) {
        throw Error('aDegreeY is out of range:' + aDegreeY);
      }
      else if (aDegreeZ > 180 || aDegreeZ < -180) {
        throw Error('aDegreeZ is out of range:' + aDegreeZ);
      }

      var mRotateZ =
            [Math.cos(this.__d2r(aDegreeZ)), Math.sin(this.__d2r(aDegreeZ)), 0, 0,
             0 - Math.sin(this.__d2r(aDegreeZ)), Math.cos(this.__d2r(aDegreeZ)), 0, 0,
             0, 0, 1, 0,
             0, 0, 0, 1];

      var mRotateX =
            [1, 0, 0, 0,
             0, Math.cos(this.__d2r(aDegreeX)), Math.sin(this.__d2r(aDegreeX)), 0,
             0, 0 - Math.sin(this.__d2r(aDegreeX)), Math.cos(this.__d2r(aDegreeX)), 0,
             0, 0, 0, 1];

      var mRotateY =
            [Math.cos(this.__d2r(aDegreeY)), 0, Math.sin(this.__d2r(aDegreeY)), 0,
             0, 1, 0, 0,
             0 - Math.sin(this.__d2r(aDegreeY)), 0, Math.cos(this.__d2r(aDegreeY)), 0,
             0, 0, 0, 1];

      this.__multiplyM(mRotateX);
      this.__multiplyM(mRotateY);
      this.__multiplyM(mRotateZ);

      return this;
    },

    scale: function(aFactorX, aFactorY, aFactorZ) {
      var m = [aFactorX, 0, 0, 0,
                   0, aFactorY, 0, 0,
                   0, 0, aFactorZ, 0,
                   0, 0, 0, 1];

      this.__multiplyM(m);
      return this;
    },

    toGLArray: function() {
      return new Float32Array(this.__mat);
    } 
};

function DrawObject() {
  this.__program = null;
  this.__VBO = [];
  this.__index = {};
  this.__uniforms = [];
  this.__textures = [];
}

DrawObject.prototype = {

  setupProgram: function(aVertexShaderSrc, aFragmentShaderSrc) {
    if (null === t3d.getGL()) {
      throw Error("WebGL context isn't created before setup shader!");
    }

    if (!aVertexShaderSrc || !aFragmentShaderSrc) {
      throw Error('Shader can not be empty!');
    }

    var gl = t3d.getGL();

    var program = gl.createProgram();
    var vShader = gl.createShader(gl.VERTEX_SHADER);
    var fShader = gl.createShader(gl.FRAGMENT_SHADER);

    gl.shaderSource(vShader, aVertexShaderSrc);
    gl.shaderSource(fShader, aFragmentShaderSrc);

    gl.compileShader(vShader);
    gl.compileShader(fShader);

    if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
      throw Error(gl.getShaderInfoLog(vShader));
    }

    if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
      throw Error(gl.getShaderInfoLog(fShader));
    }

    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw Error('Could not link the shader');
    }
    
    this.__program = program;
    return this;
  },

  addVertexData: function(aVariable, aLen, aBuffer) {
    this.__check();

    var gl = t3d.getGL();
    var VBOItem = {len: aLen};

    VBOItem.pos = gl.getAttribLocation(this.__program, aVariable);
    if (VBOItem.pos < 0){
      throw Error("Can not find attribute:"+aVariable);
    }
    
    VBOItem.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, VBOItem.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(aBuffer), gl.STATIC_DRAW);

    VBOItem.type = gl.FLOAT;

    this.__VBO[this.__VBO.length] = VBOItem;
  },

  addVertexIndex: function(aBuffer){
    this.__check();

    var gl = t3d.getGL();

    if (this.__index.buffer) {
      gl.deleteBuffer(this.__index.buffer);
    }

    this.__index.buffer = gl.createBuffer();
    this.__index.num = aBuffer.length;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.__index.buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(aBuffer), gl.STATIC_DRAW);
  },

  draw: function() {
    this.__check();

    var gl = t3d.getGL();
    gl.useProgram(this.__program);

    //Vertex Array
    for (var i=0; i<this.__VBO.length; i++){
      var VBOItem = this.__VBO[i];

      gl.enableVertexAttribArray(VBOItem.pos);
      gl.bindBuffer(gl.ARRAY_BUFFER, VBOItem.buffer);
      gl.vertexAttribPointer(VBOItem.pos, VBOItem.len, VBOItem.type, false, 0, 0);
    }
    
    //Uniform
    for (i=0; i<this.__uniforms.length; i++){
      var item = this.__uniforms[i];

      if (0 == "matrix".localeCompare(item.type)){
        if (4 === item.len){
          gl.uniformMatrix4fv(item.pos, false, item.data.toGLArray());
        }
        else {
          throw Error("Not support");
        }
      }
      else if (0 == "float".localeCompare(item.type)){
        if (4 == item.len){
          gl.uniform4fv(item.pos, new Float32Array(item.data));
        }
        else {
          throw Error("Not support");
        }
      }
      else {
        throw Error("Not support, type="+item.type);
      }
    }

    //Texture
    for (i=0; i<this.__textures.length; i++){
      var texture = this.__textures[i];
      
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, texture.texture);
      gl.uniform1i(texture.pos, i);
    }


    //Index Array
    if(!this.__index.buffer){
      throw Error("Only support index draw now");
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.__index.buffer);

    gl.cullFace(gl.FRONT);
    gl.enable(gl.DEPTH_TEST);

    gl.drawElements(gl.TRIANGLES, this.__index.num, gl.UNSIGNED_SHORT, 0);
    //gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  },

  addUniform: function(aVariable, aType, aLen, aArray) {
    this.__check();

    var gl = t3d.getGL();
    var position = gl.getUniformLocation(this.__program, aVariable); 
    if (!position){
      throw Error("Can not find uniform:"+aVariable);
    }

    for(var i=0; i<this.__uniforms.length; i++){
      var item = this.__uniforms[i];

      if (item.name == aVariable){
        this.__uniforms.splice(i, 1);
        break;
      }
    }

    this.__uniforms[this.__uniforms.length] = {name: aVariable, pos: position, type: aType.toLowerCase(), len: aLen, data: aArray};
  },

  addTexture: function(aName, aImage) {
    this.__check();

    var gl = t3d.getGL();

    for (var i=0; i<this.__textures.length; i++){
      if (this.__textures[i].name == aName){
        this.__textures.splice(i, 1);
        break;
      }
    }
    
    var item = {name: aName};
    item.texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, item.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, aImage);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    item.pos = gl.getUniformLocation(this.__program, aName);

    if (!item.pos){
      throw Error("Can not find uniform " + aName);
    }

    this.__textures[this.__textures.length] = item;

    return this;
  },

  __getProgram: function(){
    return this.__program;
  },

  __check: function() {
    if (null === t3d.getGL()) {
      throw Error("WebGL context isn't created !");
    }
    
    if (null === this.__program) {
      throw Error("Program is not created before op");
    }
  }
};
