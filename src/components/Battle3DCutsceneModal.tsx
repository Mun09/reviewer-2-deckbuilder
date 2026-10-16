import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { soundEngine } from '../utils/soundEngine';
import { FastForward, Sparkles, Skull } from 'lucide-react';

export interface CutsceneEventData {
  id: string;
  type: 'PLAYER_CRITICAL' | 'BOSS_ULTIMATE';
  title: string;
  subtitle: string;
  quoteOrDialogue: string;
  damage: number;
  rank?: 'S' | 'A' | 'B' | 'C' | 'F';
}

interface Battle3DCutsceneModalProps {
  event: CutsceneEventData | null;
  onComplete: () => void;
}

const CUTSCENE_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Chroma-keys pitch-black background out of the 2D character art and adds an arcane rim glow in 3D space
const CHARACTER_3D_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform vec3 uRimColor;
  uniform float uFlash;
  uniform float uAlpha;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float maxCh = max(max(tex.r, tex.g), tex.b);
    float mask = smoothstep(0.03, 0.14, max(luma, maxCh));
    if (mask < 0.02) discard;

    // Sample neighbors for edge rim glow
    float n1 = texture2D(uTexture, vUv + vec2(0.008, 0.0)).r;
    float n2 = texture2D(uTexture, vUv - vec2(0.008, 0.0)).r;
    float n3 = texture2D(uTexture, vUv + vec2(0.0, 0.008)).r;
    float n4 = texture2D(uTexture, vUv - vec2(0.0, 0.008)).r;
    float edge = clamp(abs(maxCh - min(min(n1, n2), min(n3, n4))) * 2.4, 0.0, 1.0);

    vec3 col = tex.rgb + uRimColor * edge * 0.85;
    col = mix(col, vec3(1.0, 0.97, 0.88), uFlash);

    gl_FragColor = vec4(col, mask * uAlpha);
  }
`;

// Procedural 3D Arcane Tribunal Floor Shader
const FLOOR_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  varying vec2 vUv;

  void main() {
    vec2 centered = (vUv - 0.5) * 24.0;
    float dist = length(centered);

    // Perspective grid lines
    vec2 grid = abs(fract(centered - 0.5) - 0.5) / vec2(0.06);
    float line = min(grid.x, grid.y);
    float gridMask = 1.0 - min(line, 1.0);

    // Concentric arcane tribunal rings
    float ring1 = smoothstep(0.18, 0.0, abs(dist - 4.2 - sin(uTime * 2.0) * 0.15));
    float ring2 = smoothstep(0.14, 0.0, abs(dist - 7.8));
    float pulse = smoothstep(0.35, 0.0, abs(dist - mod(uTime * 9.0, 14.0)));

    float fade = smoothstep(12.0, 1.5, dist);
    vec3 col = mix(vec3(0.03, 0.02, 0.02), uPrimaryColor, (gridMask * 0.35 + ring1 + ring2 * 0.7) * fade);
    col += uSecondaryColor * pulse * fade * 0.9;

    gl_FragColor = vec4(col, fade * 0.92);
  }
`;

export const Battle3DCutsceneModal: React.FC<Battle3DCutsceneModalProps> = ({
  event,
  onComplete,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [phaseLabel, setPhaseLabel] = useState<'CHARGE' | 'STRIKE' | 'IMPACT'>('CHARGE');
  const [impactFlash, setImpactFlash] = useState(false);

  useEffect(() => {
    if (!event) return;
    const container = mountRef.current;
    if (!container) return;

    const isPlayerCrit = event.type === 'PLAYER_CRITICAL';
    const primaryHex = isPlayerCrit ? 0xf5c85b : 0xe02838;
    const secondaryHex = isPlayerCrit ? 0x38bdf8 : 0xff7a33;

    // Trigger opening charge audio
    if (isPlayerCrit) {
      soundEngine.playCutsceneCharge();
    } else {
      soundEngine.playBossUltimateCutscene();
    }

    setPhaseLabel('CHARGE');
    setImpactFlash(false);

    // 1. Setup Three.js Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isPlayerCrit ? 0x07060a : 0x0c0406);
    scene.fog = new THREE.FogExp2(isPlayerCrit ? 0x07060a : 0x0c0406, 0.045);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Dynamic 3D Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.PointLight(primaryHex, 6, 28);
    mainLight.position.set(0, 4, 4);
    scene.add(mainLight);

    const rimLight = new THREE.PointLight(secondaryHex, 5, 24);
    rimLight.position.set(isPlayerCrit ? -6 : 6, 3, -3);
    scene.add(rimLight);

    // 3. Arcane 3D Tribunal Floor
    const floorUniforms = {
      uTime: { value: 0 },
      uPrimaryColor: { value: new THREE.Color(primaryHex) },
      uSecondaryColor: { value: new THREE.Color(secondaryHex) },
    };
    const floorMat = new THREE.ShaderMaterial({
      vertexShader: CUTSCENE_VERTEX_SHADER,
      fragmentShader: FLOOR_FRAGMENT_SHADER,
      uniforms: floorUniforms,
      transparent: true,
      depthWrite: false,
      extensions: { derivatives: true } as unknown as undefined,
    });
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(34, 34), floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -2.1;
    scene.add(floorMesh);

    // 4. Gothic 3D Cathedral Pillars in the background
    const pillarGeo = new THREE.CylinderGeometry(0.38, 0.48, 12, 8);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x161210,
      roughness: 0.4,
      metalness: 0.6,
    });
    const ringBandGeo = new THREE.TorusGeometry(0.46, 0.06, 8, 16);
    const ringBandMat = new THREE.MeshBasicMaterial({ color: primaryHex });

    for (let i = -3; i <= 3; i++) {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(i * 3.6, 3.5, -5.2);
      scene.add(p);

      const band = new THREE.Mesh(ringBandGeo, ringBandMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(i * 3.6, 0.2, -5.2);
      scene.add(band);
    }

    // 5. Load Character Textures onto 2.5D/3D Multi-Slice Volumetric Standees
    const texLoader = new THREE.TextureLoader();
    const playerTex = texLoader.load('/assets/player_grad_student.png');
    const bossTex = texLoader.load('/assets/boss_reviewer2.png');

    const createVolumetricCharacterGroup = (
      texture: THREE.Texture,
      rimHex: number,
      w: number,
      h: number
    ) => {
      const group = new THREE.Group();
      const uniforms = {
        uTexture: { value: texture },
        uRimColor: { value: new THREE.Color(rimHex) },
        uFlash: { value: 0.0 },
        uAlpha: { value: 1.0 },
      };

      // Stack 5 depth layers for 3D parallax thickness when camera orbits
      const layers = 5;
      for (let i = 0; i < layers; i++) {
        const isFront = i === 0;
        const mat = new THREE.ShaderMaterial({
          vertexShader: CUTSCENE_VERTEX_SHADER,
          fragmentShader: CHARACTER_3D_FRAGMENT_SHADER,
          uniforms: isFront
            ? uniforms
            : {
                uTexture: { value: texture },
                uRimColor: { value: new THREE.Color(rimHex) },
                uFlash: uniforms.uFlash,
                uAlpha: { value: 0.35 },
              },
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: isFront,
        });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        mesh.position.z = -i * 0.045;
        group.add(mesh);
      }

      return { group, uniforms };
    };

    const player3D = createVolumetricCharacterGroup(playerTex, 0x38bdf8, 3.5, 4.1);
    player3D.group.position.set(-5.4, 0.0, 0);
    player3D.group.rotation.y = 0.24;
    scene.add(player3D.group);

    const boss3D = createVolumetricCharacterGroup(bossTex, 0xe02838, 4.3, 4.7);
    boss3D.group.position.set(5.4, 0.25, 0);
    boss3D.group.rotation.y = -0.24;
    scene.add(boss3D.group);

    // 6. 3D Arcane Halo Rings around Attacker
    const attackerRingsGroup = new THREE.Group();
    attackerRingsGroup.position.copy(
      isPlayerCrit ? player3D.group.position : boss3D.group.position
    );
    scene.add(attackerRingsGroup);

    const ringRadii = [1.8, 2.35, 2.9];
    ringRadii.forEach((r, idx) => {
      const rGeo = new THREE.TorusGeometry(r, 0.035, 12, 64);
      const rMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? primaryHex : secondaryHex,
        transparent: true,
        opacity: 0.85,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.x = idx * 0.7;
      rMesh.rotation.y = idx * 0.5;
      attackerRingsGroup.add(rMesh);
    });

    // 7. 3D Colossal Ultimate Projectile (Golden Quill-Spear of Truth OR Crimson Executioner Meteor)
    const projectileGroup = new THREE.Group();
    const spearTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 2.4, 6),
      new THREE.MeshStandardMaterial({
        color: primaryHex,
        emissive: primaryHex,
        emissiveIntensity: 1.6,
        metalness: 0.9,
        roughness: 0.1,
      })
    );
    spearTip.rotation.z = isPlayerCrit ? -Math.PI / 2 : Math.PI / 2;
    projectileGroup.add(spearTip);

    const spearCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.06, 4.2, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    spearCore.rotation.z = isPlayerCrit ? -Math.PI / 2 : Math.PI / 2;
    spearCore.position.x = isPlayerCrit ? -1.8 : 1.8;
    projectileGroup.add(spearCore);

    const orbitRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.04, 8, 32),
      new THREE.MeshBasicMaterial({ color: secondaryHex })
    );
    orbitRing1.rotation.y = Math.PI / 2;
    projectileGroup.add(orbitRing1);

    const orbitRing2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.03, 8, 32),
      new THREE.MeshBasicMaterial({ color: primaryHex })
    );
    orbitRing2.rotation.y = Math.PI / 2;
    orbitRing2.position.x = isPlayerCrit ? -0.7 : 0.7;
    projectileGroup.add(orbitRing2);

    projectileGroup.visible = false;
    scene.add(projectileGroup);

    // 8. Target 3D Crystalline Barrier (Shatters on Impact!)
    const targetPos = isPlayerCrit ? boss3D.group.position : player3D.group.position;
    const shieldMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.1, 1),
      new THREE.MeshStandardMaterial({
        color: isPlayerCrit ? 0xe02838 : 0x38bdf8,
        emissive: isPlayerCrit ? 0x6e0d16 : 0x0c4a6e,
        wireframe: true,
        transparent: true,
        opacity: 0.75,
      })
    );
    shieldMesh.position.copy(targetPos);
    scene.add(shieldMesh);

    // 9. 3D Shatter Shards + Shockwave Rings (Triggered at Impact)
    interface Shard3D {
      mesh: THREE.Mesh;
      vel: THREE.Vector3;
      rotVel: THREE.Vector3;
    }
    const shards: Shard3D[] = [];
    const shardGeo = new THREE.OctahedronGeometry(0.24, 0);
    for (let i = 0; i < 72; i++) {
      const shardMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? primaryHex : secondaryHex,
        emissive: i % 2 === 0 ? primaryHex : secondaryHex,
        emissiveIntensity: 0.9,
        metalness: 0.8,
        roughness: 0.2,
      });
      const m = new THREE.Mesh(shardGeo, shardMat);
      m.visible = false;
      scene.add(m);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 4.5 + Math.random() * 9.5;
      shards.push({
        mesh: m,
        vel: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed + 2.0,
          Math.cos(phi) * speed
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 14
        ),
      });
    }

    const shockwaveRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.08, 12, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
      })
    );
    shockwaveRing.position.copy(targetPos);
    shockwaveRing.rotation.y = Math.PI / 2;
    shockwaveRing.visible = false;
    scene.add(shockwaveRing);

    // 10. 3D Volumetric Particle Field (500 embers)
    const particleCount = 450;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: primaryHex,
      size: 0.11,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 11. Animation Loop (Total Duration: 2.85 seconds)
    const TOTAL_DURATION = 2.85;
    const CHARGE_END = 0.92;
    const IMPACT_TIME = 1.68;

    let rafId = 0;
    let hasTriggeredStrike = false;
    let hasTriggeredImpact = false;
    const clock = new THREE.Clock();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const dt = Math.min(0.05, clock.getDelta() || 0.016);
      floorUniforms.uTime.value = elapsed;

      // Rotate arcane rings & shield
      attackerRingsGroup.children.forEach((child, idx) => {
        child.rotation.z += (idx % 2 === 0 ? 1 : -1) * 0.045;
        child.rotation.x += 0.02;
      });
      shieldMesh.rotation.y += 0.025;
      shieldMesh.rotation.x += 0.015;
      particleSystem.rotation.y = elapsed * 0.12;

      if (elapsed < CHARGE_END) {
        // PHASE 1: Heroic / Ominous 3D Camera Orbit on Attacker
        const p = elapsed / CHARGE_END;
        const ease = 1 - Math.pow(1 - p, 3);

        if (isPlayerCrit) {
          camera.position.set(
            -5.4 + Math.sin(ease * 0.9) * 1.6,
            -0.3 + ease * 0.6,
            3.6 - ease * 0.55
          );
          camera.lookAt(-5.1, 0.25, 0);
        } else {
          camera.position.set(
            5.4 - Math.sin(ease * 0.9) * 1.6,
            -0.4 + ease * 0.9,
            3.8 - ease * 0.65
          );
          camera.lookAt(5.1, 0.45, 0);
        }

        const scalePulse = 1 + Math.sin(p * Math.PI) * 0.12;
        attackerRingsGroup.scale.setScalar(scalePulse);
      } else if (elapsed < IMPACT_TIME) {
        // PHASE 2: High-Speed 3D Projectile Tracking Shot across the Cathedral
        if (!hasTriggeredStrike) {
          hasTriggeredStrike = true;
          setPhaseLabel('STRIKE');
          projectileGroup.visible = true;
        }

        const p = (elapsed - CHARGE_END) / (IMPACT_TIME - CHARGE_END);
        const easeIn = p * p * (3 - 2 * p);

        const startX = isPlayerCrit ? -4.2 : 4.2;
        const endX = isPlayerCrit ? 4.8 : -4.8;
        const currX = THREE.MathUtils.lerp(startX, endX, easeIn);
        const currY = isPlayerCrit
          ? 0.25 + Math.sin(p * Math.PI) * 0.65
          : THREE.MathUtils.lerp(2.8, 0.15, easeIn);

        projectileGroup.position.set(currX, currY, 0.3);
        projectileGroup.rotation.x += 0.28;
        mainLight.position.set(currX, currY + 1.5, 2.5);

        // Dynamic tracking camera flying alongside the 3D spear
        camera.fov = 48 + Math.sin(p * Math.PI) * 14;
        camera.updateProjectionMatrix();
        camera.position.set(
          currX * 0.65,
          0.6 + Math.sin(p * Math.PI) * 0.5,
          4.9 - p * 1.1
        );
        camera.lookAt(currX, currY * 0.5, 0);
      } else {
        // PHASE 3: Cataclysmic 3D Impact & Crystal Shield Shatter!
        if (!hasTriggeredImpact) {
          hasTriggeredImpact = true;
          setPhaseLabel('IMPACT');
          setImpactFlash(true);
          setTimeout(() => setImpactFlash(false), 160);

          soundEngine.playCutsceneImpact();
          projectileGroup.visible = false;
          shieldMesh.visible = false;
          shockwaveRing.visible = true;

          shards.forEach((s) => {
            s.mesh.position.copy(targetPos);
            s.mesh.visible = true;
          });
        }

        const p = Math.min(1, (elapsed - IMPACT_TIME) / (TOTAL_DURATION - IMPACT_TIME));
        const shakeDecay = Math.pow(1 - p, 2) * 0.42;
        const shakeX = (Math.random() - 0.5) * shakeDecay;
        const shakeY = (Math.random() - 0.5) * shakeDecay;

        // Expand 3D shockwave ring
        const waveScale = 1 + p * 8.5;
        shockwaveRing.scale.setScalar(waveScale);
        (shockwaveRing.material as THREE.MeshBasicMaterial).opacity = Math.max(
          0,
          1 - p * 1.15
        );

        // Update 3D flying crystal shards
        shards.forEach((s) => {
          s.mesh.position.addScaledVector(s.vel, dt || 0.016);
          s.vel.y -= 9.8 * (dt || 0.016);
          s.mesh.rotation.x += s.rotVel.x * 0.016;
          s.mesh.rotation.y += s.rotVel.y * 0.016;
          s.mesh.rotation.z += s.rotVel.z * 0.016;
        });

        // Knockback & white hit-flash on target 3D model
        const targetChar = isPlayerCrit ? boss3D : player3D;
        targetChar.uniforms.uFlash.value = Math.max(0, 1 - p * 3.2);
        const baseTargetX = isPlayerCrit ? 5.4 : -5.4;
        const knockDir = isPlayerCrit ? 1 : -1;
        targetChar.group.position.x =
          baseTargetX + knockDir * Math.sin(Math.min(1, p * 2.5) * Math.PI) * 0.65;

        camera.fov = 46;
        camera.updateProjectionMatrix();
        camera.position.set(
          (isPlayerCrit ? 3.8 : -3.8) + shakeX,
          0.35 + shakeY,
          4.1 + p * 0.8
        );
        camera.lookAt(targetPos.x, 0.25, 0);
      }

      renderer.render(scene, camera);

      if (elapsed >= TOTAL_DURATION) {
        onCompleteRef.current();
        return;
      }
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [event]);

  useEffect(() => {
    if (!event) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        onCompleteRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [event]);

  if (!event) return null;

  const isPlayerCrit = event.type === 'PLAYER_CRITICAL';

  return (
    <div
      onClick={() => onCompleteRef.current()}
      className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none cursor-pointer"
    >
      {/* Fullscreen Three.js 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Impact Frame White/Gold/Crimson Flash */}
      {impactFlash && (
        <div
          className={`absolute inset-0 pointer-events-none z-20 ${
            isPlayerCrit ? 'bg-[#fff4cc]/70' : 'bg-[#ff2a38]/65'
          }`}
        />
      )}

      {/* Top Cinematic Widescreen Letterbox Bar */}
      <div className="relative z-30 h-20 w-full bg-gradient-to-b from-black via-black/95 to-transparent border-b-2 border-[#c89d54]/60 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isPlayerCrit ? (
            <span className="px-3 py-1 rounded bg-gradient-to-r from-[#8c6218] to-[#4d3309] border border-[#ffd875] text-[#fff6d6] font-cinzel font-black text-xs tracking-widest flex items-center gap-1.5 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-[#ffd875]" />
              CRITICAL COUNTER-REBUTTAL // RANK {event.rank || 'S'}
            </span>
          ) : (
            <span className="px-3 py-1 rounded bg-gradient-to-r from-[#7a1119] to-[#3d070b] border border-[#ff6b78] text-[#ffe0e3] font-cinzel font-black text-xs tracking-widest flex items-center gap-1.5 shadow-lg">
              <Skull className="w-3.5 h-3.5 text-[#ff7a85]" />
              REVIEWER 2 ULTIMATE EXECUTION // CRIMSON INK VERDICT
            </span>
          )}
          <span className="text-sm md:text-base font-serif font-black text-[#f5ebd6] tracking-wide">
            {event.title}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCompleteRef.current();
          }}
          className="px-3 py-1 rounded bg-[#1c1611]/90 hover:bg-[#2e241b] border border-[#8a6d3b] text-[#e6d5b8] text-xs font-serif font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 text-[#d4a857]" />
          <span>SKIP (SPACE / CLICK)</span>
        </button>
      </div>

      {/* Center-Right / Center-Left Dramatic Impact Callout Banner */}
      <div className="relative z-30 flex-1 flex items-center justify-center pointer-events-none px-8">
        {phaseLabel === 'IMPACT' && (
          <div
            className={`transform -rotate-2 px-8 py-4 rounded-xl border-2 shadow-[0_20px_60px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-150 ${
              isPlayerCrit
                ? 'bg-gradient-to-r from-[#291b06]/90 via-[#472f0a]/90 to-[#1c1204]/90 border-[#ffd875]'
                : 'bg-gradient-to-r from-[#2e070b]/90 via-[#520c13]/90 to-[#1f0407]/90 border-[#ff5967]'
            }`}
          >
            <div className="text-center">
              <div
                className={`font-cinzel font-black text-xs tracking-[0.25em] uppercase ${
                  isPlayerCrit ? 'text-[#ffd875]' : 'text-[#ff858f]'
                }`}
              >
                {event.subtitle}
              </div>
              <div
                className={`font-cinzel font-black text-5xl md:text-6xl mt-1 drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)] ${
                  isPlayerCrit ? 'text-[#fff7d6]' : 'text-[#ffe3e6]'
                }`}
              >
                -{event.damage} {isPlayerCrit ? 'BOSS HP' : 'MENTAL'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Cinematic Widescreen Letterbox Bar with Verbatim Quote / Ultimate Line */}
      <div className="relative z-30 h-24 w-full bg-gradient-to-t from-black via-black/95 to-transparent border-t-2 border-[#c89d54]/60 px-8 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center">
          <p
            className={`text-sm md:text-base font-serif font-bold italic line-clamp-2 ${
              isPlayerCrit ? 'text-[#fff1c2]' : 'text-[#ffccd0]'
            }`}
          >
            &ldquo;{event.quoteOrDialogue}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
};
