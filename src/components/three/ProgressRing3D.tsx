import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import './ProgressRing3D.css'

type RingProps = {
  progress: number
}

function GoldRing({ progress }: RingProps) {
  const group = useRef<Group>(null)

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.z -= delta * 0.15
    }
  })

  const start = Math.PI / 2
  const length = Math.PI * 2 * progress

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.06, 16, 64]} />
        <meshStandardMaterial color="#3a2f14" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.075, 16, 96, length]} />
        <meshStandardMaterial
          color="#d4af37"
          metalness={0.95}
          roughness={0.2}
          emissive="#8a6e2f"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* decorative start marker */}
      <mesh position={[Math.cos(start) * 1.15, Math.sin(start) * 1.15, 0]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.15} />
      </mesh>
    </group>
  )
}

type ProgressRing3DProps = {
  value: number
  label: string
  progress?: number
}

export function ProgressRing3D({
  value,
  label,
  progress = 0.9,
}: ProgressRing3DProps) {
  return (
    <div className="progress-ring">
      <div className="progress-ring__canvas">
        <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 4]} intensity={1.2} color="#fff4d6" />
          <pointLight position={[-2, -1, 2]} intensity={0.5} color="#d4af37" />
          <GoldRing progress={progress} />
        </Canvas>
      </div>
      <div className="progress-ring__content">
        <span className="progress-ring__value">{value}</span>
        <span className="progress-ring__label">{label}</span>
      </div>
    </div>
  )
}
