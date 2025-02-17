import numpy as np
from numba import cuda
import math

# Define our simulation constants.
G = 1.0           # Simplified gravitational constant.
SOFTENING = 1e-9  # Softening factor to avoid singularities.

@cuda.jit
def update_kernel(positions, velocities, masses, dt, n):
    """
    CUDA kernel that computes the net gravitational acceleration for each body
    and then updates its velocity and position using Euler integration.
    
    positions: (n,3) array of current positions.
    velocities: (n,3) array of current velocities.
    masses: (n) array of masses.
    dt: time step for integration.
    n: number of bodies.
    """
    i = cuda.grid(1)
    if i < n:
        ax = 0.0
        ay = 0.0
        az = 0.0
        
        # Compute gravitational acceleration from every other body.
        for j in range(n):
            if i != j:
                dx = positions[j, 0] - positions[i, 0]
                dy = positions[j, 1] - positions[i, 1]
                dz = positions[j, 2] - positions[i, 2]
                distSqr = dx * dx + dy * dy + dz * dz + SOFTENING
                invDist = 1.0 / math.sqrt(distSqr)
                invDist3 = invDist * invDist * invDist
                factor = G * masses[j] * invDist3
                ax += dx * factor
                ay += dy * factor
                az += dz * factor
        
        # Update velocity with computed acceleration.
        velocities[i, 0] += ax * dt
        velocities[i, 1] += ay * dt
        velocities[i, 2] += az * dt
        
        # Update position using the updated velocity.
        positions[i, 0] += velocities[i, 0] * dt
        positions[i, 1] += velocities[i, 1] * dt
        positions[i, 2] += velocities[i, 2] * dt

def simulate_nbody(simulation_input):
    """
    Run the N-body simulation using the input data.
    
    simulation_input: a dictionary containing:
        - "simulationData": mapping each body name to its initial conditions.
          Each body must have 'x', 'y', 'z', 'vx', 'vy', 'vz', 'mass', etc.
        - "settingsData": simulation settings (e.g., simulationCycle and timeStep).
    
    Returns:
        A dictionary with a key "frames" mapping to a list of simulation frames.
        Each frame is a dictionary mapping each body to its 3D position.
    """
    simulationData = simulation_input["simulationData"]
    settingsData = simulation_input["settingsData"]
    simulationCycle = settingsData["simulationCycle"]
    dt = settingsData["timeStep"]

    # Convert the simulationData dictionary into arrays.
    body_names = list(simulationData.keys())
    n = len(body_names)
    
    positions = np.zeros((n, 3), dtype=np.float32)
    velocities = np.zeros((n, 3), dtype=np.float32)
    masses = np.zeros(n, dtype=np.float32)

    for i, body in enumerate(body_names):
        body_data = simulationData[body]
        positions[i, 0] = body_data["x"]
        positions[i, 1] = body_data["y"]
        positions[i, 2] = body_data["z"]

        velocities[i, 0] = body_data["vx"]
        velocities[i, 1] = body_data["vy"]
        velocities[i, 2] = body_data["vz"]

        masses[i] = body_data["mass"]

    # Copy arrays to the GPU.
    d_positions = cuda.to_device(positions)
    d_velocities = cuda.to_device(velocities)
    d_masses = cuda.to_device(masses)

    # Determine CUDA grid configuration.
    threadsperblock = 32
    blockspergrid = (n + threadsperblock - 1) // threadsperblock

    # List to store the simulation frames.
    frames = []

    # Run the simulation over the specified number of cycles.
    for step in range(simulationCycle):
        update_kernel[blockspergrid, threadsperblock](d_positions, d_velocities, d_masses, dt, n)
        cuda.synchronize()
        
        
        current_positions = d_positions.copy_to_host()
        

        frame = {}
        for i, body in enumerate(body_names):
            frame[body] = {
                "x": float(current_positions[i, 0]),
                "y": float(current_positions[i, 1]),
                "z": float(current_positions[i, 2])
            }
        frames.append(frame)

    return {"frames": frames}

if __name__ == '__main__':
    sample_data = {
        "simulationData": {
            "Body1": {"x": -0.73, "y": 0, "z": 0, "vx": 0, "vy": -0.0015, "vz": 0, "mass": 1, "time": 0, "timeStep": 0.01},
            "Body2": {"x": 60.34, "y": 0, "z": 0, "vx": 0, "vy": 0.13, "vz": 0, "mass": 0.0123, "time": 0, "timeStep": 0.01}
        },
        "settingsData": {"simulationCycle": 500, "timeStep": 0.01}
    }

    result = simulate_nbody(sample_data)
    print("Frame 0:", result["frames"][0])
