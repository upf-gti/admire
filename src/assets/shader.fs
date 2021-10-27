precision mediump float;

varying vec2 v_texcoord;

uniform sampler2D u_frame;
uniform float u_time;

void main()
{
    vec4 texture = texture2D(u_frame, v_texcoord);
    texture.r += sin(u_time)*.5+.5;
    gl_FragColor = texture;
}