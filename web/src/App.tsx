import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Button, Flex, Heading, Separator, Slider, Table } from '@radix-ui/themes';
import * as THREE from 'three';
import { Link } from 'react-router-dom';
import { Routes } from 'routes';

type AgentData = Record<string, number>;
type DataFrame = Record<string, AgentData>;
type DataPoint = [number, number, DataFrame];
type SimulationObjectsProps = {
  data: DataPoint[];
  currentTime: number;
  isPlaying: boolean;
  setCurrentTime: (time: number) => void; 
};

const App = () => {
  const [simulationData, setSimulationData] = useState<DataPoint[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initialState, setInitialState] = useState<DataFrame>({});
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let canceled = false;

    async function fetchData() {
      try {
        const response = await fetch('http://localhost:8000/simulation');
        if (canceled) return;
        let data: DataPoint[] = await response.json();
        
        setSimulationData(data);
        setInitialState(data[0][2]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }

    fetchData();

    return () => {
      canceled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Handle play/pause animation
  useEffect(() => {
    if (isPlaying && simulationData.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => (prev < simulationData.length - 1 ? prev + 1 : 0));
      }, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, simulationData]);

  return (
    <div style={{ height: '100vh', width: '100vw', margin: '0 auto', backgroundColor: '#000000' }}>
      <Flex direction="column" m="4" width="100%" justify="center" align="center">
        <Heading as="h1" size="8" weight="bold" mb="4">
          3D N-Body Simulation
        </Heading>
        <Link to={Routes.FORM} style={{ color: 'blue' }}>
          Define new simulation parameters
        </Link>
        <Separator size="4" my="5" />

        {/* 3D Canvas */}
        <Canvas style={{ width: '80%', height: '500px', backgroundColor: '#ffffff' }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <OrbitControls enableZoom={true} />

          {simulationData.length > 1 && (
            <SimulationObjects data={simulationData} currentTime={currentTime} isPlaying={isPlaying} setCurrentTime={setCurrentTime}/>
          )}

          {/* Axes */}
          <Axes />
        </Canvas>

        {/* Playback Controls */}
        <Flex align="center" justify="center" mt="4">
          <Button onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? 'Pause' : 'Play'}</Button>
          <Slider
            min={0}
            max={simulationData.length - 1}
            step={1}
            value={[currentTime]}
            onValueChange={(value) => setCurrentTime(value[0])}
            style={{ width: '300px', margin: '0 20px' }}
          />
        </Flex>
        <Flex justify="center" width="100%" m="4">
          <Table.Root style={{ width: '800px', backgroundColor: '#000000', color: 'white', borderRadius: '10px' }}>
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Position (x, y, z)</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Initial Velocity (vx, vy, vz)</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {Object.entries(initialState).map(([agentId, { x, y, z, vx, vy, vz }]) => (
                <Table.Row key={agentId}>
                  <Table.RowHeaderCell>{agentId}</Table.RowHeaderCell>
                  <Table.Cell>({x.toFixed(2)}, {y.toFixed(2)}, {z.toFixed(2)})</Table.Cell>
                  <Table.Cell>({vx.toFixed(2)}, {vy.toFixed(2)}, {vz.toFixed(2)})</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>
      </Flex>
    </div>
  );
};

// Linear interpolation function
const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

// Component to display simulation objects with velocity vectors
const SimulationObjects = ({ data, currentTime, isPlaying, setCurrentTime }: SimulationObjectsProps) => {
  const refs = useRef<Record<string, THREE.Mesh>>({});
  const t = useRef(0); // Use a ref to persist t between renders
  const speed = 1; // Adjust this to control the speed of the animation

  // Track the last known position for each body
  const lastKnownPositions = useRef<Record<string, { x: number; y: number; z: number }>>({});

  useFrame((state, delta) => {
    if (!isPlaying) return;

    const currentFrame = data[currentTime][2];
    const nextFrame = data[Math.min(currentTime + 1, data.length - 1)][2];

    const timeDifference = data[currentTime + 1]?.[0] - data[currentTime]?.[0];

    t.current += (delta / timeDifference) * speed;

    if (t.current >= 1) {
      t.current = 0;
      setCurrentTime(currentTime < data.length - 1 ? currentTime + 1 : 0);
    }

    Object.entries(currentFrame).forEach(([agentId, { x, y, z }]) => {
      const nextPos = nextFrame[agentId];

      lastKnownPositions.current[agentId] = { x, y, z };

      if (refs.current[agentId]) {
        const targetX = nextPos?.x ?? lastKnownPositions.current[agentId].x;
        const targetY = nextPos?.y ?? lastKnownPositions.current[agentId].y;
        const targetZ = nextPos?.z ?? lastKnownPositions.current[agentId].z;

        refs.current[agentId].position.x = lerp(x, targetX, t.current);
        refs.current[agentId].position.y = lerp(y, targetY, t.current);
        refs.current[agentId].position.z = lerp(z, targetZ, t.current);
      }
    });
  });

  return (
    <>
      {Object.entries(data[currentTime][2]).map(([agentId, { x, y, z }]) => {
        return (
          <mesh key={agentId} position={[x, y, z]} ref={(el) => (refs.current[agentId] = el!)}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshStandardMaterial color="red" />
          </mesh>
        );
      })}
    </>
  );
};



// Axes helper
const Axes = () => (
  <>
    <line>
      <bufferGeometry attach="geometry">
        <bufferAttribute attach="attributes-position" array={new Float32Array([-1000, 0, 0, 1000, 0, 0])} count={2} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="red" />
    </line>

    <line>
      <bufferGeometry attach="geometry">
        <bufferAttribute attach="attributes-position" array={new Float32Array([0, -1000, 0, 0, 1000, 0])} count={2} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="green" />
    </line>

    <line>
      <bufferGeometry attach="geometry">
        <bufferAttribute attach="attributes-position" array={new Float32Array([0, 0, -1000, 0, 0, 1000])} count={2} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="blue" />
    </line>
  </>
);

export default App;