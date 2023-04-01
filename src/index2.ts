import { Printer } from './Printer'
import { Simulator } from './Simulator'

const svgContainer = document.querySelector<HTMLDivElement>('#svgDiv')

const simulator = new Simulator()

// 1. create field areas
simulator.createFieldArea({
  border: 'x > 0 and x < 150', // `false`(全空间) | (x, y) => boolean | string
  E: (x, y, t) => ({ x: 0, y: 0 }), // `t` for time (in second)
  // (or) E: { x: 0, y: 0 },
  B: (x, y, t) => ({ z: -1 }) // same as E, only in z direction
})
simulator.createFieldArea({
  border: (x, y) => x > -350 && x < -200, // <= an example for function
  E: { x: 0, y: 0 },
  B: (x, y, t) => ({ z: -1 })
})

// 2. create particles
for (let i = -110; i <= 110; i += 50) {
  // NOTICE: no fucntions allowed in defining particles
  simulator.createParticle({
    charge: -1,
    mass: 10,
    position: { x: -110, y: i },
    v: { x: 10, y: 0 }
  })
}

// 3. set time (in second)
simulator.setDeltaTime(0.01)
simulator.setSimulationTimeRange({ from: 0, to: 100 })

// 4. start
// * You can open the console to watch the simulation.
// * It may take some time
simulator.startSimulate()

// 5. print
if (svgContainer !== null) {
  // do not change the width and height
  const printer = new Printer({ svgContainer, width: 600, height: 600 })
  console.time('print')
  printer.print({ simulator })
  console.timeEnd('print')
}
