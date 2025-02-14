import { Form, FormField, FormLabel } from '@radix-ui/react-form';
import { Button, Card, Flex, Heading, Separator, TextField } from '@radix-ui/themes';
import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Routes } from 'routes';

type FormValue = number | '';
type BodyData = {
  x: FormValue;
  y: FormValue;
  z: FormValue;
  vx: FormValue;
  vy: FormValue;
  vz: FormValue;
  mass: FormValue;
};

type FormData = Record<string, BodyData>;
type SimulationSettings = {
  simulationCycle: number;
  timeStep: number;
};

const SimulateForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    Body1: { x: -0.73, y: 0, z: 0, vx: 0, vy: -0.0015, vz: 0, mass: 1 },
    Body2: { x: 60.34, y: 0, z: 0, vx: 0, vy: 0.13, vz: 0, mass: 0.0123 },
  });
  const [settings, setSettings] = useState<SimulationSettings>({
    simulationCycle: 500,
    timeStep: 0.01,
  });

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue: FormValue = value === '' ? '' : parseFloat(value);
    setFormData((prev) => ({
      ...prev,
      [name.split('.')[0]]: {
        ...prev[name.split('.')[0]],
        [name.split('.')[1]]: newValue,
      },
    }));
  }, []);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: parseFloat(value) }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationData: formData,
          settingsData: settings,
        }),
      });
      if (!response.ok) throw new Error('Network response was not ok');
      navigate(Routes.SIMULATION);
    } catch (error) {
      console.error('Error:', error);
    }
  }, [formData, settings]);

  const addBody = () => {
    const newBodyId = `Body${Object.keys(formData).length + 1}`;
    setFormData((prev) => ({
      ...prev,
      [newBodyId]: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 1 },
    }));
  };

  const removeBody = (bodyId: string) => {
    if (Object.keys(formData).length > 1) {
      setFormData((prev) => {
        const updatedData = { ...prev };
        delete updatedData[bodyId];
        return updatedData;
      });
    }
  };

  return (
    <div style={{ position: 'relative', top: '5%', left: 'calc(10%)', width: '80%', overflow: 'auto' }}>
      <Card>
        <Heading as="h2" size="4" weight="bold" mb="4">Run a Simulation</Heading>
        <Link to={Routes.SIMULATION}>View previous simulation</Link>
        <Separator size="4" my="5" />

        <Form onSubmit={handleSubmit}>
          <label>Simulation Cycle: {settings.simulationCycle}</label>
          <input type="range" min="0" max="10000" name="simulationCycle" value={settings.simulationCycle} onChange={handleSettingsChange} />
          
          <label>Time Step: {settings.timeStep}</label>
          <input type="range" min="0" max="1" step="0.01" name="timeStep" value={settings.timeStep} onChange={handleSettingsChange} />

          <table>
            <thead>
              <tr>
                <th>Body</th><th>init X</th><th>init Y</th><th>init Z</th><th>init V_x</th><th>init V_y</th><th>init V_z</th><th>Mass</th><th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(formData).map(([bodyId, bodyData]) => (
                <tr key={bodyId}>
                  <td><strong>{bodyId}</strong></td>
                  {Object.entries(bodyData).map(([key, value]) => (
                    <td key={key}>
                      <TextField.Root
                        type="number"
                        name={`${bodyId}.${key}`}
                        value={value}
                        onChange={handleChange}
                        required
                      />
                    </td>
                  ))}
                  <td>
                    <Button onClick={() => removeBody(bodyId)}>Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <Flex justify="center" m="5">
            <Button type="button" onClick={addBody}>Add Body</Button>
          </Flex>
          <Flex justify="center" m="5">
            <Button type="submit">Submit</Button>
          </Flex>
        </Form>
      </Card>
    </div>
  );
};

export default SimulateForm;
