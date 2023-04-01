import { Printer } from './Printer'
import { Simulator } from './Simulator'

const svgContainer = document.querySelector<HTMLDivElement>('#svgDiv')

const simulator = new Simulator()

// 1. create field areas
simulator.createFieldArea({
  border: false,
  E: (x, y, t) => ({ x: 1, y: 1 }),
  // E: (x, y, t) => ({ x: 0, y: Math.floor(t) % 10 < 5 ? 10 : -10 }),
  B: (x, y, t) => ({ z: 1 })
})

// 2. create particles
simulator.createParticle({
  charge: 1,
  mass: 1,
  position: { x: 1, y: 1 },
  v: { x: 10, y: 0 }
})

// 3. set time (in second)
simulator.setDeltaTime(0.3)
simulator.setSimulationTimeRange({ from: 0, to: 50 })

// 4. start
// * You can open the console to watch the simulation.
// * It may take some time
document.querySelector('#accurate')?.addEventListener('click', () => {
  simulator.startSimulate({ accurate: true })
  p()
})
document.querySelector('#normal')?.addEventListener('click', () => {
  simulator.startSimulate({ accurate: false })
  p()
})

// 5. print
function p (): void {
  if (svgContainer !== null) {
    // do not change the width and height
    const printer = new Printer({ svgContainer, width: 600, height: 600 })
    console.time('print')
    printer.print({ simulator })
    console.timeEnd('print')
  }
}
