import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import './MarbleBackground.css'

function MarblePlane() {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color('#050505') },
        uColorB: { value: new THREE.Color('#1a1408') },
        uGold: { value: new THREE.Color('#d4af37') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uGold;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 uv = vUv * 3.0;
          float t = uTime * 0.08;
          float n = fbm(uv + vec2(t, -t * 0.6));
          float veins = smoothstep(0.45, 0.72, fbm(uv * 1.8 + n * 2.0));
          vec3 base = mix(uColorA, uColorB, n);
          vec3 col = mix(base, uGold * 0.55, veins * 0.55);
          col += uGold * pow(veins, 3.0) * 0.25;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    })
  }, [])

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta
  })

  return (
    <mesh ref={meshRef} scale={[6, 10, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

type MarbleBackgroundProps = {
  className?: string
}

export function MarbleBackground({ className = '' }: MarbleBackgroundProps) {
  return (
    <div className={`marble-bg ${className}`} aria-hidden>
      <Canvas camera={{ position: [0, 0, 2.2], fov: 50 }} dpr={[1, 1.5]}>
        <MarblePlane />
      </Canvas>
      <div className="marble-bg__vignette" />
    </div>
  )
}
