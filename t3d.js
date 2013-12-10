/*This would expose the "t3d" object to the global context*/

var t3d = {
  init: function(aCanvas) {
    try {
      glContext = aCanvas.getContext("experimental-webgl");
      glContext.viewport(0, 0, aCanvas.width, aCanvas.height);
    }
    catch (e) {
      var msg = "Error creating WebGL context!: " + e.toString();
      throw Error(msg);
    }

    return glContext;
  },

  setupProgram: function(aVertexShaderSrc, aFragmentShaderSrc) {
    if (!glContext) {
      throw Error("WebGL context isn't created before setup shader!");
    }

    if (!aVertexShaderSrc || !aFragmentShaderSrc) {
      throw Error("Shader can not be empty!");
    }

    var program = glContext.createProgram();
    var vShader = glContext.createShader(glContext.VERTEX_SHADER);
    var fShader = glContext.createShader(glContext.FRAGMENT_SHADER);

    glContext.shaderSource(vShader, aVertexShaderSrc);
    glContext.shaderSource(fShader, aFragmentShaderSrc);

    glContext.compileShader(vShader);
    glContext.compileShader(fShader);

    if (!glContext.getShaderParameter(vShader, glContext.COMPILE_STATUS)) {
      throw Error(glContext.getShaderInfoLog(vShader));
    }

    if (!glContext.getShaderParameter(fShader, glContext.COMPILE_STATUS)) {
      throw Error(glContext.getShaderInfoLog(fShader));
    }

    glContext.attachShader(program, vShader);
    glContext.attachShader(program, fShader);
    glContext.linkProgram(program);

    if (!glContext.getProgramParameter(program, glContext.LINK_STATUS)){
      throw Error("Could not link the shader");
    }

    return program;
  },

  getGL: function() {
    return glContext;
  },

  Matrix: {
    multiply: function (aMatrixA, aMatrixB) {
    },

    transpose: function (aMatrix) {
    },

    frunstum: function (aLeft, aRigt, aTop, aBottom, aNear, aFar) {
    },

    lookAt: function (aPosX, aPosY, aPosZ, aCenterX, aCenterY, aCenterZ, aUpX, aUpY, aUpZ) {
    },

    translate: function (aDistX, aDistY, aDistZ) {
    },

    rotate: function (aDegreeX, aDegreeY, aDegreeZ) {
    },

    scale: function (aFactorX, aFactorY, aFactorZ) {
    },

   
  },


  //XXX the private items/function should be protected in someway
  glContext: null,

};

