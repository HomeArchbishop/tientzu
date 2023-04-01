const sampleJSONInput1 = {
  deltaTime: 0.01,
  timeRange: { from: 0, to: 100 },
  fields: [
    {
      border: 'x > 0 and x < 150',
      E: { x: 0, y: 0 },
      B: { z: -1 }
    },
    {
      border: 'x > -350 and x < -200',
      E: { x: 0, y: 0 },
      B: { z: -1 }
    }
  ],
  particles: [
    {
      charge: -1,
      mass: 10,
      position: { x: -110, y: -100 },
      v: { x: 10, y: 0 }
    },
    {
      charge: -1,
      mass: 10,
      position: { x: -110, y: 50 },
      v: { x: 10, y: 0 }
    }
  ]
}

export {
  sampleJSONInput1
}
