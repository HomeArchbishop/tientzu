import './styles/ui.less'

import { createApp, ref, computed } from 'vue'
import type { Ref } from 'vue'

import { sampleJSONInput1 } from './sampleJSON'
import { JSONInputValidate } from './parser'
import type { JSONInput } from './parser'

import { Printer } from '../Printer'
import { Simulator } from '../Simulator'

type ConsoleType = 'json' | 'list'

const consoleType: Ref<ConsoleType> = ref('json')
const jsonInput: Ref<JSONInput> = ref(sampleJSONInput1)

const jsonInputStr = computed<string>({
  get () {
    return JSON.stringify(jsonInput.value, null, 2)
  },
  set (newValue) {
    jsonInput.value = JSON.parse(newValue)
  }
})

function changeConsoleType (nextType: ConsoleType): void {
  consoleType.value = nextType
}

async function simulate (): Promise<void> {
  if (JSONInputValidate(jsonInput.value)) {
    console.log(jsonInput.value)
  } else {
    console.log(JSONInputValidate.errors)
    return
  }
  const simulator = new Simulator()
  for (const field of jsonInput.value.fields) {
    simulator.createFieldArea(field)
  }
  for (const particle of jsonInput.value.particles) {
    simulator.createParticle(particle)
  }
  simulator.setDeltaTime(jsonInput.value.deltaTime)
  simulator.setSimulationTimeRange(jsonInput.value.timeRange)

  simulator.startSimulate()

  const svgContainer = document.querySelector<HTMLDivElement>('#svgDiv')
  if (svgContainer !== null) {
    const printer = new Printer({ svgContainer, width: 600, height: 600 })
    console.time('print')
    printer.print({ simulator })
    console.timeEnd('print')
  }
}

const app = createApp({
  setup () {
    return {
      consoleType,
      jsonInputStr,
      changeConsoleType,
      simulate
    }
  }
})

app.mount('#dashboard')
