import numpy as np
from numba import njit

@njit
def propagate_numba_n(time, timeStep, mass, x, y, z, vx, vy, vz,
                        other_x, other_y, other_z, other_mass):
    """
    Compute the new state for one body, given its own state and the states
    of all the other bodies in the system.
    """
    ax = 0.0
    ay = 0.0
    az = 0.0
    n = other_mass.shape[0]
    for i in range(n):
        # Compute relative position vector (from other body to self)
        dx = x - other_x[i]
        dy = y - other_y[i]
        dz = z - other_z[i]
        # Compute squared distance
        r2 = dx * dx + dy * dy + dz * dz
        # Avoid division by zero (or add a softening factor if desired)
        if r2 == 0.0:
            continue
        r = np.sqrt(r2)
        r3 = r * r2  # equivalent to |r|^3

        # Sum gravitational acceleration contributions (no gravitational constant)
        ax += -other_mass[i] * dx / r3
        ay += -other_mass[i] * dy / r3
        az += -other_mass[i] * dz / r3

    # Update velocity based on the total acceleration
    new_vx = vx + ax * timeStep
    new_vy = vy + ay * timeStep
    new_vz = vz + az * timeStep

    # Update position based on the new velocity
    new_x = x + new_vx * timeStep
    new_y = y + new_vy * timeStep
    new_z = z + new_vz * timeStep

    new_time = time + timeStep
    # Generate a new timeStep (Numba supports np.random.random in nopython mode)
    new_timeStep = 5.0 + np.random.random() * 9.0

    return new_time, new_timeStep, mass, new_x, new_y, new_z, new_vx, new_vy, new_vz

def propagate(agent_id, universe):
    """
    A wrapper that extracts the state of the current body (agent_id),
    builds NumPy arrays for the states of the other bodies, calls the
    Numba-compiled function, and repacks the results into a dictionary.
    """
    # Extract the state for the body we are updating.
    self_state = universe[agent_id]
    time = self_state["time"]
    timeStep = self_state["timeStep"]
    mass = self_state["mass"]
    x = self_state["x"]
    y = self_state["y"]
    z = self_state["z"]
    vx = self_state["vx"]
    vy = self_state["vy"]
    vz = self_state["vz"]

    # Build arrays for the other bodies (exclude self)
    other_x = []
    other_y = []
    other_z = []
    other_mass = []
    for key, state in universe.items():
        if key == agent_id:
            continue
        other_x.append(state["x"])
        other_y.append(state["y"])
        other_z.append(state["z"])
        other_mass.append(state["mass"])

    # Convert to NumPy arrays with float64 type.
    other_x = np.array(other_x, dtype=np.float64)
    other_y = np.array(other_y, dtype=np.float64)
    other_z = np.array(other_z, dtype=np.float64)
    other_mass = np.array(other_mass, dtype=np.float64)

    # Call the optimized Numba function.
    result = propagate_numba_n(time, timeStep, mass, x, y, z, vx, vy, vz,
                               other_x, other_y, other_z, other_mass)
    keys = ["time", "timeStep", "mass", "x", "y", "z", "vx", "vy", "vz"]
    return dict(zip(keys, result))
