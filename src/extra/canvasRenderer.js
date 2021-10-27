"use strict";

const VERTEX_SOURCE =
`
attribute vec3 a_position;
attribute vec2 a_texcoord;

varying vec2 v_texcoord;

void main()
{
    gl_Position = vec4(a_position, 1.0);
    v_texcoord = a_texcoord;
}
`;

const FRAGMENT_SOURCE =
`
precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D u_frame;

void main()
{
    gl_FragColor = texture2D(u_frame, v_texcoord);
}
`;

export function CanvasRenderer( canvas )
{
    if( !(canvas instanceof HTMLCanvasElement) )
    {
        return null;
    }

    let gl = canvas.getContext("webgl");
    let handle = null;
    let pixelSource = null;

    let vertexBuffer = null;
    let indexBuffer = null;
    let textureCoordinateBuffer = null;

    let texture = null;
    let unit = 0;
    let program = null;

    let stream = null;
    let onUpdate = null;

    /**
     * Create the vertex, index and texture coordinate buffers.
     */
    let createBuffers = function()
    {
        // Vertex buffer.
        let vertices = [1, 1, 0, 1, -1, 0, -1, -1, 0, -1, 1, 0];
        vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        // Index buffer.
        let indices = [0, 1, 2, 0, 2, 3];
        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        // Texture coordinate buffer.
        let textureCoordinates = [1, 0, 1, 1, 0, 1, 0, 0];
        textureCoordinateBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinateBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    };

    function setUpdate( callback ){
        onUpdate = callback;
    }

    /**
     * Create the target texture.
     */
    let createTexture = function()
    {
        texture = gl.createTexture();
    
        // Active the texture unit.
        gl.activeTexture(gl.TEXTURE0 + unit);
    
        // Bind the texture to the texture unit.
        gl.bindTexture(gl.TEXTURE_2D, texture);
    
        // Turn off mip maps and set wrapping to clamp to edge so it will work regardless of the dimensions of the video.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    
        let target = gl.TEXTURE_2D;
        let level = 0;
        let internalFormat = gl.RGBA;
        let width = 1;
        let height = 1;
        let border = 0;
        let format = gl.RGBA;
        let type = gl.UNSIGNED_BYTE;
        let pixels = new Uint8Array([0, 0, 0, 255]);
        gl.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
    };

    /**
     * Update the target texture.
     */
    let updateTexture = function( source )
    {
        let target = gl.TEXTURE_2D;
        let level = 0;
        let internalFormat = gl.RGBA;
        let format = gl.RGBA;
        let type = gl.UNSIGNED_BYTE;
        gl.texImage2D(target, level, internalFormat, format, type, source);
    };

    /**
     * Create a shader.
     */
    let createShader = function( source, type )
    {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
    
        let compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if( !compiled )
        {
            let log = gl.getShaderInfoLog(shader);
            console.error(`Error while compiling  ${type === gl.FRAGMENT_SHADER?"fragment":"vertex"} shader: `,log);
            console.error(source.split("\n").map( (v,k) => `${k.toString().padStart(4, '0')}\t${v}`).join("\n"));
            console.error("--------------------------------------------------------------------------------------");
            return null;
        }
    
        return shader;
    };

    /**
     * Create the program.
     */
    let createProgram = function( vertexSource, fragmentSource )
    {
        program = gl.createProgram();
    
        let vertexShader = createShader(vertexSource, gl.VERTEX_SHADER);
        if( !vertexShader )
        {
            return false;
        }

        let fragmentShader = createShader(fragmentSource, gl.FRAGMENT_SHADER);
        if( !fragmentShader )
        {
            return false;
        }
    
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
    
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
    
        gl.linkProgram(program);

        return true;
    };

    /**
     * Use the program.
     */
    let setProgram = function()
    {
        gl.useProgram(program);
    };

    /**
     * Bind the vertex, index and texture coordinate buffers to the program.
     */
    let bindBuffers = function()
    {
        // Vertex buffer.
        let positionAttribute = gl.getAttribLocation(program, "a_position");
        let size = 3;
        let type = gl.FLOAT;
        let normalized = false;
        let stride = 0;
        let offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.vertexAttribPointer(positionAttribute, size, type, normalized, stride, offset);
        gl.enableVertexAttribArray(positionAttribute);

        // Index buffer.
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

        // Texture coordinate buffer.
        let textureCoordinateAttribute = gl.getAttribLocation(program, "a_texcoord");
        size = 2;
        type = gl.FLOAT;
        normalized = false;
        stride = 0;
        offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordinateBuffer);
        gl.vertexAttribPointer(textureCoordinateAttribute, size, type, normalized, stride, offset);
        gl.enableVertexAttribArray(textureCoordinateAttribute);
    };

    /**
     * Set the program uniforms.
     */
    let setUniforms = function()
    {
        let uniform = gl.getUniformLocation(program, "u_frame");
    
        // Set the uniform to the texture unit.
        gl.uniform1i(uniform, unit);
    };

    /**
     * Resize the canvas.
     */
    let resize = function( source )
    {
        if( source instanceof HTMLImageElement || source instanceof HTMLCanvasElement )
        {
            if( canvas.width != source.width || canvas.height != source.height )
            {
                canvas.width = source.width;
                canvas.height = source.height;
            }
        }
        else if( source instanceof HTMLVideoElement )
        {
            if( canvas.width != source.videoWidth || canvas.height != source.videoHeight )
            {
                canvas.width = source.videoWidth;
                canvas.height = source.videoHeight;
            }
        }
    }

    /**
     * Render the pixel source to the canvas.
     */
    let render = function()
    {
        if(onUpdate) onUpdate();

        resize(pixelSource);

        updateTexture(pixelSource);
    
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    
        handle = window.requestAnimationFrame(render);
    };

    /**
     * Initialize the renderer.
     */
    let initialize = function()
    {
        createBuffers();
        createTexture();
        createProgram(VERTEX_SOURCE, FRAGMENT_SOURCE);
        setProgram();
        bindBuffers();
        setUniforms();
    };

    /**
     * Get the canvas.
     */
    let getCanvas = function()
    {
        return canvas;
    };

    /**
     * Get the canvas' stream.
     */
    let getStream = function( frameRate = undefined )
    {
        if( !stream )
        {
            stream = canvas.captureStream(frameRate);
        }

        return stream;
    };

    /**
     * Validate the pixel source type.
     * Reference: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/texImage2D
     */
    let validateSource = function( source )
    {
        let types = [HTMLImageElement, HTMLCanvasElement, HTMLVideoElement];
        return types.some(type => source instanceof type);
    };

    /**
     * Set the pixel source. Supported types are HTMLImageElement, HTMLCanvasElement and HTMLVideoElement.
     */
    let setSource = function( source )
    {
        if( validateSource(source) )
        {
            pixelSource = source;
            return true;
        }

        return false;
    };

    /**
     * Set the fragment shader.
     */
    let setShader = function( shader )
    {
        if( createProgram(VERTEX_SOURCE, shader) )
        {
            setProgram();
            bindBuffers();
            setUniforms();
        }
        else
        {
            createProgram(VERTEX_SOURCE, FRAGMENT_SOURCE);
            setProgram();
            bindBuffers();
            setUniforms();
        }
    };

    /**
     * Set an int uniform.
     */
    let setInt = function( name, value )
    {
        let uniform = gl.getUniformLocation(program, name);
        gl.uniform1i(uniform, value);
    };

    /**
     * Set a float uniform.
     */
    let setFloat = function( name, value )
    {
        let uniform = gl.getUniformLocation(program, name);
        gl.uniform1f(uniform, value);
    };

    /**
     * Set a float vector uniform.
     */
    let setVector = function( name, ...vector )
    {
        let uniform = gl.getUniformLocation(program, name);
        switch( vector.length )
        {
            case 2: gl.uniform2f(uniform, vector); break;
            case 3: gl.uniform3f(uniform, vector); break;
            case 4: gl.uniform4f(uniform, vector); break;
        }
    };

    /**
     * Set a float matrix uniform in column major order.
     */
    let setMatrix = function( name, matrix )
    {
        let uniform = gl.getUniformLocation(program, name);
        switch( matrix.length )
        {
            case 4:  gl.uniformMatrix2fv(uniform, false, matrix); break;
            case 9:  gl.uniformMatrix3fv(uniform, false, matrix); break;
            case 16: gl.uniformMatrix4fv(uniform, false, matrix); break;
        }
    };

    /**
     * Start the rendering.
     */
    let start = function()
    {
        if( handle || !pixelSource )
        {
            return;
        }

        render();
    };

    /**
     * Stop the rendering.
     */
    let stop = function()
    {
        if( !handle )
        {
            return;
        }

        window.cancelAnimationFrame(handle);
        handle = null;
    };

    initialize();

    return {
        getCanvas,
        getStream,
        setSource,
        setShader,
        setUpdate,
        setInt,
        setFloat,
        setVector,
        setMatrix,
        start,
        stop
    };
}