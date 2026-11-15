"use client";

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Status } from "@/lib/triage";
import { ANCHOR_IDS, ANCHORS, type AnchorBus, type AnchorFrame, type AnchorId } from "./anchors";
import { createXrayMaterials, type XrayMaterials } from "./xrayMaterial";

const GLB_URL = "/models/body.glb";
/** Draw order: body depth pre-pass, body shell, then the anchor nodes on top. */
const ORDER = { depth: 1, shell: 2, nodes: 3 } as const;

const FOV = 28;
const HOME_DISTANCE = 5.4;
const HOME_TARGET = new THREE.Vector3(0, -0.02, 0);
const FOCUS_DISTANCE = 3.7;
/** Shifts the focused zone left of centre so the side panel does not cover it. */
const FOCUS_SIDE_SHIFT = 0.42;
const TWEEN_S = 0.6;

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function homePosition(yawDeg: number): THREE.Vector3 {
  const yaw = (yawDeg * Math.PI) / 180;
  return new THREE.Vector3(
    HOME_TARGET.x + HOME_DISTANCE * Math.sin(yaw),
    HOME_TARGET.y,
    HOME_TARGET.z + HOME_DISTANCE * Math.cos(yaw),
  );
}

/* ---------- glTF body ---------- */

/** public/models/body.glb fitted to the 2-unit body frame, drawn twice: depth, then shell. */
function GlbBody({ mats, onReady }: { mats: XrayMaterials; onReady: () => void }) {
  // No Draco and no Meshopt: the model ships uncompressed, so no WebAssembly decoder is loaded.
  const { scene } = useGLTF(GLB_URL, false, false);
  useEffect(() => onReady(), [onReady]);
  const fitted = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = 2 / size.y;
    const clone = (material: THREE.Material, order: number) => {
      const root = scene.clone(true);
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.material = material;
          o.renderOrder = order;
        }
      });
      root.scale.setScalar(s);
      root.position.set(-center.x * s, -center.y * s, -center.z * s);
      return root;
    };
    return { depth: clone(mats.depth, ORDER.depth), shell: clone(mats.shell, ORDER.shell) };
  }, [scene, mats]);
  return (
    <>
      <primitive object={fitted.depth} />
      <primitive object={fitted.shell} />
    </>
  );
}

/* ---------- anchor nodes ---------- */

/** About 1 cm in a body two units tall (about 1.75 m). */
const NODE_RADIUS = 0.006;

function glowTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(c);
}

interface AnchorNodeProps {
  id: AnchorId;
  status: Status;
  bpm: number;
  color: string;
  reduced: boolean;
  glow: THREE.Texture;
}

/**
 * One small node at an anchor: a sphere of about 1 cm, a soft glow and a thin
 * ring, facing the camera. Shape follows the state: cyan dot in range, amber
 * ring that pulses for caution, larger coral fill to act. The heart node beats
 * at the shown heart rate (scale 1.00 to 1.03). Reduced motion stills both.
 * It fades out when its zone faces away (orientation, no raycast).
 */
function AnchorNode({ id, status, bpm, color, reduced, glow }: AnchorNodeProps) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const sphereMat = useRef<THREE.MeshBasicMaterial>(null);
  const glowMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const normal = useMemo(() => new THREE.Vector3(...ANCHORS[id].normal).normalize(), [id]);
  const toCam = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock }) => {
    const g = group.current;
    if (!g || !ring.current || !sphereMat.current || !glowMat.current || !ringMat.current) return;
    const t = clock.elapsedTime;
    g.quaternion.copy(camera.quaternion);
    toCam.copy(camera.position).sub(g.position).normalize();
    const vis = Math.min(1, Math.max(0, (normal.dot(toCam) + 0.05) * 5));
    g.visible = vis > 0.01;
    sphereMat.current.opacity = vis;
    glowMat.current.opacity = 0.22 * vis;

    let ringScale = 1;
    let ringAlpha = 0.7;
    if (status === "caution" && !reduced) {
      const k = (Math.sin((2 * Math.PI * t) / 2.4) + 1) / 2;
      ringScale = 1 + 0.35 * k;
      ringAlpha = 0.9 - 0.55 * k;
    }
    ring.current.scale.setScalar(ringScale);
    ringMat.current.opacity = ringAlpha * vis;

    let scale = status === "act" ? 1.4 : 1;
    if (id === "heart" && !reduced) {
      const phase = ((t * bpm) / 60) % 1;
      const beat = phase < 0.15 ? phase / 0.15 : phase < 0.45 ? 1 - (phase - 0.15) / 0.3 : 0;
      scale *= 1 + 0.03 * beat;
    }
    g.scale.setScalar(scale);
  });

  return (
    <group ref={group} position={[...ANCHORS[id].position]}>
      <mesh renderOrder={ORDER.nodes}>
        <planeGeometry args={[NODE_RADIUS * 9, NODE_RADIUS * 9]} />
        <meshBasicMaterial ref={glowMat} map={glow} color={color} transparent depthTest={false} depthWrite={false} />
      </mesh>
      <mesh ref={ring} renderOrder={ORDER.nodes}>
        <ringGeometry args={[NODE_RADIUS * 2.6, NODE_RADIUS * 3.0, 48]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent depthTest={false} depthWrite={false} />
      </mesh>
      <mesh renderOrder={ORDER.nodes}>
        <sphereGeometry args={[NODE_RADIUS, 20, 14]} />
        <meshBasicMaterial ref={sphereMat} color={color} transparent depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function AnchorNodes({
  status,
  bpm,
  colors,
  reduced,
}: {
  status: Record<AnchorId, Status>;
  bpm: number;
  colors: Record<Status, string>;
  reduced: boolean;
}) {
  const glow = useMemo(() => glowTexture(), []);
  useEffect(() => () => glow.dispose(), [glow]);
  return (
    <>
      {ANCHOR_IDS.map((id) => (
        <AnchorNode
          key={id}
          id={id}
          status={status[id]}
          bpm={bpm}
          color={colors[status[id]]}
          reduced={reduced}
          glow={glow}
        />
      ))}
    </>
  );
}

/** Thin floor ring with a front tick: shows the figure turns. */
function TurnRing({ color }: { color: string }) {
  return (
    <group position={[0, -1.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[0.46, 0.468, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.44, 0.49, 24, 1, -Math.PI / 2 - 0.09, 0.18]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------- anchors to screen ---------- */

function AnchorProjector({ bus }: { bus: AnchorBus }) {
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const toCam = useMemo(() => new THREE.Vector3(), []);
  const normals = useMemo(
    () =>
      Object.fromEntries(
        ANCHOR_IDS.map((id) => [id, new THREE.Vector3(...ANCHORS[id].normal).normalize()]),
      ) as Record<AnchorId, THREE.Vector3>,
    [],
  );
  const last = useRef("");

  useFrame(({ camera, size }) => {
    const frame = {} as AnchorFrame;
    for (const id of ANCHOR_IDS) {
      const p = ANCHORS[id].position;
      tmp.set(p[0], p[1], p[2]);
      toCam.copy(camera.position).sub(tmp).normalize();
      const facing = normals[id].dot(toCam);
      tmp.project(camera);
      frame[id] = {
        x: ((tmp.x + 1) / 2) * size.width,
        y: ((1 - tmp.y) / 2) * size.height,
        facing,
      };
    }
    const key = ANCHOR_IDS.map(
      (id) => `${frame[id].x.toFixed(1)},${frame[id].y.toFixed(1)},${frame[id].facing.toFixed(2)}`,
    ).join("|");
    if (key !== last.current) {
      last.current = key;
      bus.publish(frame);
    }
  });
  return null;
}

/* ---------- camera ---------- */

interface Pose {
  p: THREE.Vector3;
  t: THREE.Vector3;
}

function focusPose(id: AnchorId): Pose {
  const a = ANCHORS[id];
  const n = new THREE.Vector3(...a.normal).setY(0).normalize();
  const right = new THREE.Vector3(0, 1, 0).cross(n).normalize();
  const t = new THREE.Vector3(...a.position).addScaledVector(right, FOCUS_SIDE_SHIFT);
  return { p: t.clone().addScaledVector(n, FOCUS_DISTANCE), t };
}

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

const UP = new THREE.Vector3(0, 1, 0);
const TURN_RAD = Math.PI / 6;
const TURN_S = 0.3;

/** A turn asked for by the buttons or the keyboard: dragging is never the only way. */
export interface TurnCommand {
  kind: "left" | "right" | "reset";
  /** Changes on every press */
  id: number;
}

/** Eases the camera to a zone (about 600 ms) and back, and turns it on command. */
function CameraDirector({
  focus,
  reduced,
  turn,
  homeYaw,
}: {
  focus: AnchorId | null;
  reduced: boolean;
  turn: TurnCommand | null;
  homeYaw: number;
}) {
  const current = useRef<AnchorId | null>(null);
  const turned = useRef(0);
  const duration = useRef(TWEEN_S);
  const home = useRef<Pose | null>(null);
  const tween = useRef<{ from: Pose; to: Pose; start: number } | null>(null);

  useFrame(({ camera, clock, controls }) => {
    const orbit = controls as unknown as OrbitControlsImpl | null;
    if (!orbit) return;

    if (focus !== current.current) {
      const from = { p: camera.position.clone(), t: orbit.target.clone() };
      if (focus && current.current === null) home.current = from;
      const to = focus
        ? focusPose(focus)
        : (home.current ?? { p: homePosition(0), t: HOME_TARGET.clone() });
      tween.current = { from, to, start: clock.elapsedTime };
      duration.current = TWEEN_S;
      current.current = focus;
      orbit.enabled = false;
    }

    if (turn && turn.id !== turned.current) {
      turned.current = turn.id;
      if (focus === null) {
        // Start from where a running turn is headed, so quick presses add up.
        const from = { p: camera.position.clone(), t: orbit.target.clone() };
        const base = tween.current?.to ?? from;
        const to =
          turn.kind === "reset"
            ? { p: homePosition(homeYaw), t: HOME_TARGET.clone() }
            : {
                p: base.t
                  .clone()
                  .add(base.p.clone().sub(base.t).applyAxisAngle(UP, turn.kind === "left" ? -TURN_RAD : TURN_RAD)),
                t: base.t.clone(),
              };
        tween.current = { from, to, start: clock.elapsedTime };
        duration.current = TURN_S;
        orbit.enabled = false;
      }
    }

    const tw = tween.current;
    if (!tw) return;
    const k = reduced ? 1 : Math.min(1, (clock.elapsedTime - tw.start) / duration.current);
    const e = ease(k);
    camera.position.lerpVectors(tw.from.p, tw.to.p, e);
    orbit.target.lerpVectors(tw.from.t, tw.to.t, e);
    orbit.update();
    if (k >= 1) {
      tween.current = null;
      orbit.enabled = true;
    }
  });
  return null;
}

/* ---------- canvas ---------- */

export interface Body3DProps {
  bus: AnchorBus;
  focus: AnchorId | null;
  /** State of each zone (worst metric); drives the node colour and shape. */
  nodeStatus: Record<AnchorId, Status>;
  /** Shown heart rate; the heart node beats at it. */
  bpm: number;
  /** ?demo=1 fixes the camera; any tag or node click also stops the initial spin */
  frozen: boolean;
  initialYaw: number;
  reducedMotion: boolean;
  /** Latest turn asked for from outside the canvas */
  turn: TurnCommand | null;
  /** Called once the model is on screen */
  onReady: () => void;
}

export default function Body3D({ bus, focus, nodeStatus, bpm, frozen, initialYaw, reducedMotion, turn, onReady }: Body3DProps) {
  const [spinning, setSpinning] = useState(!reducedMotion);
  const cyan = useMemo(() => cssColor("--cyan"), []);
  const stateColors = useMemo<Record<Status, string>>(
    () => ({ ok: cssColor("--cyan"), caution: cssColor("--amber"), act: cssColor("--coral"), offline: cssColor("--slate") }),
    [],
  );
  // Body: cyan Fresnel rim, cyan interior at 6%.
  const mats = useMemo(() => createXrayMaterials(cyan, cyan, 0.06), [cyan]);
  const start = useMemo(() => homePosition(initialYaw), [initialYaw]);

  useEffect(
    () => () => {
      mats.depth.dispose();
      mats.shell.dispose();
    },
    [mats],
  );

  return (
    <Canvas
      className="!absolute inset-0"
      flat
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
      camera={{ fov: FOV, position: [start.x, start.y, start.z], near: 0.1, far: 50 }}
      aria-hidden="true"
    >
      <OrbitControls
        makeDefault
        target={[HOME_TARGET.x, HOME_TARGET.y, HOME_TARGET.z]}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        minPolarAngle={Math.PI * 0.38}
        maxPolarAngle={Math.PI * 0.58}
        minDistance={2.0}
        maxDistance={6.5}
        autoRotate={spinning && !reducedMotion && !frozen && focus === null}
        autoRotateSpeed={0.6}
        onStart={() => setSpinning(false)}
      />
      <CameraDirector focus={focus} reduced={reducedMotion} turn={turn} homeYaw={initialYaw} />
      <AnchorProjector bus={bus} />
      <TurnRing color={cyan} />
      <AnchorNodes status={nodeStatus} bpm={bpm} colors={stateColors} reduced={reducedMotion} />
      {/* The model loads after the page; until then the flat silhouette stands in. */}
      <Suspense fallback={null}>
        <GlbBody mats={mats} onReady={onReady} />
      </Suspense>
    </Canvas>
  );
}
