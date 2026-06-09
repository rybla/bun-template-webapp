/**
 * ============================================================================
 * TESSERACT 4D ANIMATION WEB APP
 * ============================================================================
 * * FILE ORGANIZATION:
 * 1. Shaders (Vertex & Fragment): GLSL code strings performing 4D rotations,
 * 4D-to-3D perspective projection, 3D rotations, and depth-based coloring.
 * 2. Helper Functions: Utilities for creating and compiling WebGL shaders/programs.
 * 3. Geometry Generation: Code generating the 16 vertices and 32 edges of a hypercube.
 * 4. React Component (TesseractApp): The core component managing the canvas element,
 * WebGL context initialization, buffer configurations, and the requestAnimationFrame loop.
 */

import styles from "@/component/Home.module.css";
import React, { useEffect, useRef } from "react";
import { do_ } from "@/utility";

// ============================================================================
// WEBGL SHADER SOURCE CODES
// ============================================================================

const vertexShaderSource = do_(() =>
  `
attribute vec4 a_position;
uniform float u_time;
uniform float u_aspect;
varying vec4 v_color;

void main() {
  vec4 p = a_position;

  // Rotate in the XW plane
  float theta = u_time * 0.6;
  float c1 = cos(theta);
  float s1 = sin(theta);
  float x1 = p.x * c1 - p.w * s1;
  float w1 = p.x * s1 + p.w * c1;
  p.x = x1;
  p.w = w1;

  // Rotate in the YZ plane
  float phi = u_time * 0.4;
  float c2 = cos(phi);
  float s2 = sin(phi);
  float y2 = p.y * c2 - p.z * s2;
  float z2 = p.y * s2 + p.z * c2;
  p.y = y2;
  p.z = z2;

  // Perspective projection from 4D to 3D
  // The 4D camera is placed at W = 2.2 to prevent division by zero
  float distance4D = 2.2;
  float factor = 1.0 / (distance4D - p.w);
  vec3 pos3D = vec3(p.x * factor, p.y * factor, p.z * factor);

  // Rotate the resulting 3D structure in the 3D XY plane for better viewing angle
  float psi = u_time * 0.25;
  float c3 = cos(psi);
  float s3 = sin(psi);
  float x3 = pos3D.x * c3 - pos3D.y * s3;
  float y3 = pos3D.x * s3 + pos3D.y * c3;
  pos3D.x = x3;
  pos3D.y = y3;

  // Standard 3D perspective transformation mapping onto the 2D clip space
  float distance3D = 2.5;
  gl_Position = vec4(
      pos3D.x * u_aspect,
      pos3D.y,
      pos3D.z / distance3D,
      distance3D - pos3D.z
  );

  // Dynamic vertex coloring based on the transformed 4D depth (w1)
  v_color = vec4(0.2 + (w1 + 1.0) * 0.3, 0.6 + (w1 + 1.0) * 0.2, 1.0, 1.0);
}
`.trim()
);

const fragmentShaderSource = do_(() =>
  `
precision mediump float;
varying vec4 v_color;

void main() {
  gl_FragColor = v_color;
}
`.trim()
);

// ============================================================================
// WEBGL INITIALIZATION HELPERS
// ============================================================================

function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

// ============================================================================
// TESSERACT GEOMETRY GENERATION
// ============================================================================

// Generate the 16 vertices of a hypercube in 4D space (-1 or 1 for each coordinate)
const vertices: number[] = [];
for (let i = 0; i < 16; i++) {
  vertices.push(
    i & 1 ? 1.0 : -1.0,
    i & 2 ? 1.0 : -1.0,
    i & 4 ? 1.0 : -1.0,
    i & 8 ? 1.0 : -1.0
  );
}

// Generate indices for the 32 edges (lines connecting vertices with a Hamming distance of 1)
const indices: number[] = [];
for (let i = 0; i < 16; i++) {
  for (let j = i + 1; j < 16; j++) {
    const xor = i ^ j;
    if ((xor & (xor - 1)) === 0) {
      indices.push(i, j);
    }
  }
}

// ============================================================================
// MAIN REACT APP COMPONENT
// ============================================================================

export default function TesseractApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    // Initialize shaders and link program
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    if (!program) return;

    // Look up shader attributes and uniform locations
    const positionAttributeLocation = gl.getAttribLocation(
      program,
      "a_position"
    );
    const timeUniformLocation = gl.getUniformLocation(program, "u_time");
    const aspectUniformLocation = gl.getUniformLocation(program, "u_aspect");

    // Create and bind the Vertex Buffer Object (VBO)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    // Create and bind the Element Buffer Object (EBO) for wireframe lines
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(indices),
      gl.STATIC_DRAW
    );

    let animationFrameId: number;

    // Resizing matrix layout adjustment function
    const resize = () => {
      const displayWidth = window.innerWidth;
      const displayHeight = window.innerHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }
    };
    window.addEventListener("resize", resize);
    resize();

    // Render loop
    const render = (time: number) => {
      // Convert milliseconds to seconds
      const seconds = time * 0.001;

      // Configure canvas clearing properties
      gl.clearColor(0.02, 0.02, 0.05, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      // Use the compiled shader program
      gl.useProgram(program);

      // Bind vertex structures
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(
        positionAttributeLocation,
        4,
        gl.FLOAT,
        false,
        0,
        0
      );

      // Pass runtime variables to the uniforms
      gl.uniform1f(timeUniformLocation, seconds);
      gl.uniform1f(aspectUniformLocation, canvas.height / canvas.width);

      // Draw the hypercube wireframe configuration
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.lineWidth(2.0);
      gl.drawElements(gl.LINES, indices.length, gl.UNSIGNED_SHORT, 0);

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    // Clean up WebGL resources and event listeners on component unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(indexBuffer);
      gl.deleteProgram(program);
    };
  }, []);

  return (
    <canvas
      className={styles["canvas"]}
      ref={canvasRef}
      style={{
        display: "block",
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        backgroundColor: "#03030d",
      }}
    />
  );
}
