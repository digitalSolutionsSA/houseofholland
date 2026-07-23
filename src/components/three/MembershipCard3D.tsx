import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import './MembershipCard3D.css'

function CardMesh() {
  const ref = useRef<Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.rotation.y = Math.sin(t * 0.5) * 0.18
    ref.current.rotation.x = Math.cos(t * 0.35) * 0.06
  })

  return (
    <mesh ref={ref} rotation={[0.08, 0, 0]}>
      <boxGeometry args={[2.8, 1.65, 0.06]} />
      <meshStandardMaterial
        color="#0a0a0a"
        metalness={0.85}
        roughness={0.25}
        emissive="#1a1408"
        emissiveIntensity={0.15}
      />
    </mesh>
  )
}

export function MembershipCard3D() {
  return (
    <div className="membership-card-3d">
      <Canvas camera={{ position: [0, 0, 3.4], fov: 40 }} dpr={[1, 1.5]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} color="#fff2cc" />
        <pointLight position={[-2, 1, 2]} intensity={0.6} color="#d4af37" />
        <CardMesh />
      </Canvas>
      <div className="membership-card-3d__overlay">
        <div className="membership-card-3d__crest">HH</div>
        <p className="membership-card-3d__tag">TATTOO EMPORIUM</p>
      </div>
    </div>
  )
}
