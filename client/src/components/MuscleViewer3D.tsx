import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

// This is a placeholder component for the "Real 3D" view
// In a real implementation, you would load a GLTF model
// For this mockup, we'll use a procedural representation (Primitives) to simulate the body parts

function MuscleGroup({ position, scale, color, label, opacity = 1 }: any) {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHover] = useState(false);

  useFrame((state) => {
    if (mesh.current) {
        // Subtle breathing animation
        mesh.current.scale.x = scale[0] + Math.sin(state.clock.elapsedTime) * 0.02;
    }
  });

  return (
    <mesh
      ref={mesh}
      position={position}
      scale={scale}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <capsuleGeometry args={[1, 2, 8, 16]} />
      <meshStandardMaterial
        color={hovered ? "#ffffff" : color}
        transparent
        opacity={opacity}
        emissive={color}
        emissiveIntensity={hovered ? 0.8 : 0.4}
      />
    </mesh>
  );
}

interface MuscleViewer3DProps {
  highlightedMuscles: string[];
  className?: string;
}

export function MuscleViewer3D({ highlightedMuscles, className }: MuscleViewer3DProps) {
  return (
    <div className={cn("relative w-full aspect-[3/4] bg-zinc-950 rounded-2xl overflow-hidden", className)}>
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, -10, -10]} intensity={0.5} />
        
        <group position={[0, -2, 0]}>
          {/* Torso */}
          <MuscleGroup 
            position={[0, 2, 0]} 
            scale={[1.8, 2.5, 1]} 
            color={highlightedMuscles.includes('chest') ? "#3b82f6" : "#1a1a1a"}
            opacity={highlightedMuscles.includes('chest') ? 0.9 : 0.3}
          />
          
          {/* Abs */}
          <MuscleGroup 
            position={[0, -1, 0]} 
            scale={[1.5, 2, 0.8]} 
            color={highlightedMuscles.includes('abs') ? "#3b82f6" : "#1a1a1a"}
            opacity={highlightedMuscles.includes('abs') ? 0.9 : 0.3}
          />

          {/* Shoulders */}
          <MuscleGroup 
            position={[-2.2, 3.5, 0]} 
            scale={[0.8, 0.8, 0.8]} 
            color={highlightedMuscles.includes('shoulders') ? "#3b82f6" : "#1a1a1a"}
            opacity={highlightedMuscles.includes('shoulders') ? 0.9 : 0.3}
          />
          <MuscleGroup 
            position={[2.2, 3.5, 0]} 
            scale={[0.8, 0.8, 0.8]} 
            color={highlightedMuscles.includes('shoulders') ? "#3b82f6" : "#1a1a1a"}
            opacity={highlightedMuscles.includes('shoulders') ? 0.9 : 0.3}
          />

          {/* Arms */}
          <MuscleGroup 
            position={[-3, 1.5, 0]} 
            scale={[0.7, 1.5, 0.7]} 
            color={highlightedMuscles.includes('triceps') || highlightedMuscles.includes('biceps') ? "#3b82f6" : "#1a1a1a"}
            opacity={highlightedMuscles.includes('triceps') ? 0.9 : 0.3}
          />
           <MuscleGroup 
            position={[3, 1.5, 0]} 
            scale={[0.7, 1.5, 0.7]} 
            color={highlightedMuscles.includes('triceps') || highlightedMuscles.includes('biceps') ? "#3b82f6" : "#1a1a1a"}
            opacity={highlightedMuscles.includes('triceps') ? 0.9 : 0.3}
          />
        </group>

        <OrbitControls enableZoom={false} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.5} />
        <Environment preset="city" />
      </Canvas>

      <div className="absolute top-4 left-4 pointer-events-none">
        <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">
           Interactive 3D View
        </span>
      </div>
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
        <p className="text-zinc-500 text-[10px] text-center">Drag to rotate • Pinch to zoom</p>
      </div>
    </div>
  );
}