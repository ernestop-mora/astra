import * as THREE from "three";

/**
 * Translucent body: a depth-only pre-pass writes the nearest surface, then a
 * Fresnel shell draws only that surface. Back faces and overlapping inner parts
 * never show. Colours come from the caller (the design system: cyan rim, cyan interior). No glow, no scan lines.
 */
export interface XrayMaterials {
  depth: THREE.MeshBasicMaterial;
  shell: THREE.ShaderMaterial;
}

export function createXrayMaterials(rim: string, interior: string, interiorAlpha = 0.08): XrayMaterials {
  // Transparent so it sorts by renderOrder with the shell and the anchor nodes.
  const depth = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true });

  const shell = new THREE.ShaderMaterial({
    uniforms: {
      uRim: { value: new THREE.Color(rim) },
      uInterior: { value: new THREE.Color(interior) },
      uInteriorAlpha: { value: interiorAlpha },
      uRimAlpha: { value: 0.85 },
      uPower: { value: 2.4 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uRim;
      uniform vec3 uInterior;
      uniform float uInteriorAlpha;
      uniform float uRimAlpha;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
        float f = pow(1.0 - facing, uPower);
        gl_FragColor = vec4(mix(uInterior, uRim, f), mix(uInteriorAlpha, uRimAlpha, f));
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    depthFunc: THREE.LessEqualDepth,
    side: THREE.FrontSide,
  });

  return { depth, shell };
}
