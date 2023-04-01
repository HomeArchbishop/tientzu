import { CreateFieldAreaOptions, Field, FieldArea } from './Field'
import { Fraction, math, FRACTION_NEGATIVE_ONE } from './math'
import { Particle, ParticleConstructorOptions, ParticlePoint } from './Particle'
import { DeepReadonly, DeepReadonlyArray } from './util'
import { uid } from 'uid'

interface SimulatorOptions {
  deltaTime?: number | string | Fraction
  simulationTimeRange?: {
    from?: number | string | Fraction
    to?: number | string | Fraction
  }
}

interface StartSimulateOptions {
  accurate?: boolean
}

class Simulator {
  constructor (simulatorOptions?: SimulatorOptions) {
    this.deltaTime = math.fraction(simulatorOptions?.deltaTime ?? 0.1)
    this.simulationTimeRange = {
      from: math.fraction(simulatorOptions?.simulationTimeRange?.from ?? 0),
      to: math.fraction(simulatorOptions?.simulationTimeRange?.to ?? 30)
    }
    this.#ensureDeltaTimeLegal()
    this.#ensureTimeRangeLegal()

    this._id = uid(8)
  }

  _id: string

  #isSimulating: boolean = false
  #isSimulated: boolean = false
  #simulateProgress = NaN

  deltaTime: Fraction
  simulationTimeRange: { from: Fraction, to: Fraction }

  field: Field = new Field()
  particles: Particle[] = []

  #ensureDeltaTimeLegal (): void {
    if (math.smallerEq(this.deltaTime, 0) as boolean) {
      throw new Error('`deltaTime` of simulation should be positive, but received ' + String(this.deltaTime))
    }
  }

  #ensureTimeRangeLegal (): void {
    if (math.smaller(this.simulationTimeRange.from, 0) as boolean) {
      throw new Error('`from` in simulation time range should be zero or positive, but received ' + String(this.simulationTimeRange.from))
    }
    if (math.smaller(this.simulationTimeRange.to, this.simulationTimeRange.from) as boolean) {
      throw new Error(
        '`from` in simulation time range should be smaller than `to`, but received ' +
        String(this.simulationTimeRange.from) + ' and ' + String(this.simulationTimeRange.to))
    }
  }

  setDeltaTime (deltaTimeNumber: number): void {
    if (this.#isSimulating) { throw new Error('Simulating now. Setting delta time is not allowed') }

    this.deltaTime = math.fraction(deltaTimeNumber)
    this.#ensureDeltaTimeLegal()
  }

  getDeltaTime (): number {
    return Number(this.deltaTime)
  }

  setSimulationTimeRange ({ from, to }: Record<'from' | 'to', number | string | Fraction | undefined>): void {
    if (this.#isSimulating) { throw new Error('Simulating now. Setting time range is not allowed') }

    if (typeof from !== 'undefined') {
      this.simulationTimeRange.from = math.fraction(from)
    }
    if (typeof to !== 'undefined') {
      this.simulationTimeRange.to = math.fraction(to)
    }
    this.#ensureTimeRangeLegal()
  }

  getSimulationTimeRange (): Record<'from' | 'to', number> {
    return { from: Number(this.simulationTimeRange.from), to: Number(this.simulationTimeRange.to) }
  }

  createFieldArea = (createFieldAreaOptions: CreateFieldAreaOptions): string => {
    if (this.#isSimulating) { throw new Error('Simulating now. Create a field area is not allowed') }
    return this.field.createFieldArea(createFieldAreaOptions)
  }

  deleteFieldArea = (_id: string): boolean => {
    if (this.#isSimulating) { throw new Error('Simulating now. Delete a field area is not allowed') }

    return this.field.deleteFieldArea(_id)
  }

  createParticle = (particleConstructorOptions?: ParticleConstructorOptions): string => {
    if (this.#isSimulating) { throw new Error('Simulating now. Create a particle is not allowed') }

    const newParticle = new Particle(particleConstructorOptions)
    this.particles.push(newParticle)
    return newParticle._id
  }

  deleteParticle = (_id: string): boolean => {
    if (this.#isSimulating) { throw new Error('Simulating now. Delete a particle is not allowed') }

    const targetParticleIdx = this.particles.findIndex(particle => particle._id === _id)
    if (targetParticleIdx === -1) {
      return false
    }
    this.particles.splice(targetParticleIdx, 1)
    return true
  }

  startSimulate (startSimulateOptions?: StartSimulateOptions): void {
    if (this.#isSimulating) { throw new Error('Simulating now. Please wait.') }

    console.time('startSimulate')

    this.#isSimulating = true
    this.#isSimulated = false
    this.#simulateProgress = 0

    const isAccurate = Boolean(startSimulateOptions?.accurate ?? false)

    const _particlesCurrentPoint: Array<DeepReadonly<ParticlePoint>> = this.particles.map(particle => math.clone(particle.startingPoint))
    const simulateTimesBeforeTimeRange = +math.floor(math.divide(this.simulationTimeRange.from, this.deltaTime) as Fraction)
    const simulateTimesBeforeTimeRangeEnd = +math.ceil(math.divide(this.simulationTimeRange.to, this.deltaTime) as Fraction)

    interface CalculateParticleNextPointInterface { field: Field, particle: Particle, deltaTime: Fraction, lastPoint: DeepReadonly<ParticlePoint> }
    function calculateParticleNextPoint ({ field, particle, deltaTime, lastPoint }: CalculateParticleNextPointInterface): DeepReadonly<ParticlePoint> {
      const jointField /* comprehensive field */ = {
        E: {
          val: { x: math.fraction(0), y: math.fraction(0) }
        },
        B: {
          val: { z: math.fraction(0) }
        }
      }
      for (const area of field.area) {
        if (area.border.judge(lastPoint.position.x, lastPoint.position.y)) /* particle is in this area */ {
          const areaEVal = area.E.val(lastPoint.position.x, lastPoint.position.y, lastPoint.time)
          const areaBVal = area.B.val(lastPoint.position.x, lastPoint.position.y, lastPoint.time)
          jointField.E.val.x = math.add(jointField.E.val.x, areaEVal.x)
          jointField.E.val.y = math.add(jointField.E.val.y, areaEVal.y)
          jointField.B.val.z = math.add(jointField.B.val.z, areaBVal.z)
        }
      }
      const F_E: Record<'x' | 'y', Fraction> = {
        x: math.multiply(particle.charge, jointField.E.val.x) as Fraction, // q * E_x
        y: math.multiply(particle.charge, jointField.E.val.y) as Fraction // q * E_y
      }
      const F_B: Record<'x' | 'y', Fraction> = {
        x: math.multiply(math.multiply(particle.charge, lastPoint.v.y), jointField.B.val.z) as Fraction, // q * v_y * B_z => (vector +x)
        y: math.multiply(math.multiply(math.multiply(particle.charge, lastPoint.v.x), jointField.B.val.z), FRACTION_NEGATIVE_ONE) as Fraction // q * v_x * B_z => (vector -x)
      }
      const F: Record<'x' | 'y', Fraction> /* joint force */ = {
        x: math.add(F_E.x, F_B.x),
        y: math.add(F_E.y, F_B.y)
      }
      const a: Record<'x' | 'y', Fraction> /* acceleration */ = {
        x: math.divide(F.x, particle.mass) as Fraction,
        y: math.divide(F.y, particle.mass) as Fraction
      }
      const deltaV: Record<'x' | 'y', Fraction> = {
        x: math.multiply(a.x, deltaTime) as Fraction,
        y: math.multiply(a.y, deltaTime) as Fraction
      }
      const deltaXY: Record<'x' | 'y', Fraction> = {
        x: math.multiply(lastPoint.v.x, deltaTime) as Fraction,
        y: math.multiply(lastPoint.v.y, deltaTime) as Fraction
      }
      return {
        time: math.add(lastPoint.time, deltaTime),
        position: { x: math.add(lastPoint.position.x, deltaXY.x), y: math.add(lastPoint.position.y, deltaXY.y) },
        v: { x: math.add(lastPoint.v.x, deltaV.x), y: math.add(lastPoint.v.y, deltaV.y) }
      }
    }

    function calculateParticleNextPointAccurate ({ field, particle, deltaTime, lastPoint }: CalculateParticleNextPointInterface): DeepReadonly<ParticlePoint> {
      const jointField /* comprehensive field */ = {
        E: {
          val: { x: math.fraction(0), y: math.fraction(0) }
        },
        B: {
          val: { z: math.fraction(0) }
        }
      }
      for (const area of field.area) {
        if (area.border.judge(lastPoint.position.x, lastPoint.position.y)) /* particle is in this area */ {
          const areaEVal = area.E.val(lastPoint.position.x, lastPoint.position.y, lastPoint.time)
          const areaBVal = area.B.val(lastPoint.position.x, lastPoint.position.y, lastPoint.time)
          jointField.E.val.x = math.add(jointField.E.val.x, areaEVal.x)
          jointField.E.val.y = math.add(jointField.E.val.y, areaEVal.y)
          jointField.B.val.z = math.add(jointField.B.val.z, areaBVal.z)
        }
      }
      if (math.number(jointField.B.val.z) === 0) {
        // B === 0
        // parabola analytic expression
        const F: Record<'x' | 'y', Fraction> = {
          x: math.multiply(particle.charge, jointField.E.val.x) as Fraction, // q * E_x
          y: math.multiply(particle.charge, jointField.E.val.y) as Fraction // q * E_y
        }
        const a: Record<'x' | 'y', Fraction> /* acceleration */ = {
          x: math.divide(F.x, particle.mass) as Fraction,
          y: math.divide(F.y, particle.mass) as Fraction
        }
        const deltaXY: Record<'x' | 'y', Fraction> = {
          x: math.multiply(math.add(lastPoint.v.x, math.multiply(0.5, math.multiply(a.x, deltaTime))), deltaTime) as Fraction,
          y: math.multiply(math.add(lastPoint.v.y, math.multiply(0.5, math.multiply(a.y, deltaTime))), deltaTime) as Fraction
        }
        return {
          time: math.add(lastPoint.time, deltaTime),
          position: {
            x: math.add(deltaXY.x, lastPoint.position.x) as Fraction,
            y: math.add(deltaXY.y, lastPoint.position.y) as Fraction
          },
          v: {
            x: math.add(math.multiply(a.x, deltaTime), lastPoint.v.x) as Fraction,
            y: math.add(math.multiply(a.y, deltaTime), lastPoint.v.y) as Fraction
          }
        }
      }
      const V_EQUIVALENT: Record<'x' | 'y', Fraction> /* V_equivalent */ = {
        x: math.divide(jointField.E.val.y, jointField.B.val.z) as Fraction, // E_y / B_z => (vector +x)
        y: math.multiply(math.divide(jointField.E.val.x, jointField.B.val.z), FRACTION_NEGATIVE_ONE) as Fraction // E_y / B_z => (vector -y)
      }
      const V_CIRCLE: Record<'x' | 'y', Fraction> /* V + V_equ */ = {
        x: math.subtract(lastPoint.v.x, V_EQUIVALENT.x),
        y: math.subtract(lastPoint.v.y, V_EQUIVALENT.y)
      }
      const V_CIRCLE_ABS: Fraction = math.fraction(Math.sqrt(math.number(math.add(math.square(V_CIRCLE.x), math.square(V_CIRCLE.y)))))
      const R_CIRCLE: Record<'x' | 'y', Fraction> = {
        x: math.divide(math.multiply(particle.mass, V_CIRCLE.y), math.multiply(jointField.B.val.z, particle.charge)) as Fraction, // (m * v_y) / (B_z * q) => (vector +x)
        y: math.multiply(math.divide(math.multiply(particle.mass, V_CIRCLE.x), math.multiply(jointField.B.val.z, particle.charge)), FRACTION_NEGATIVE_ONE) as Fraction // (m * v_x) / (B_z * q) => (vector -y)
      }
      const R_CIRCLE_ABS: Fraction = math.fraction(Math.sqrt(math.number(math.add(math.square(R_CIRCLE.x), math.square(R_CIRCLE.y)))))
      if (math.number(R_CIRCLE_ABS) === 0) {
        // Uniform linear motion (匀速直线运动, 退化)
        return calculateParticleNextPoint({ field, particle, deltaTime, lastPoint })
      }
      const POSITION_CIRCLE_CENTER: Record<'x' | 'y', Fraction> = {
        x: math.add(lastPoint.position.x, R_CIRCLE.x),
        y: math.add(lastPoint.position.y, R_CIRCLE.y)
      }
      const OMIGA: Fraction = math.multiply(math.divide(V_CIRCLE_ABS, R_CIRCLE_ABS), math.multiply(FRACTION_NEGATIVE_ONE, jointField.B.val.z.s)) as Fraction
      const DELTA_THETA: number = math.number(math.multiply(deltaTime, OMIGA) as Fraction)
      const SIN_DETLA_THETA: Fraction = math.fraction(math.sin(DELTA_THETA))
      const COS_DETLA_THETA: Fraction = math.fraction(math.cos(DELTA_THETA))
      return {
        time: math.add(lastPoint.time, deltaTime),
        position: {
          x: math.add(
            math.add(POSITION_CIRCLE_CENTER.x, math.subtract(math.multiply(R_CIRCLE.y, SIN_DETLA_THETA), math.multiply(COS_DETLA_THETA, R_CIRCLE.x))),
            math.multiply(V_EQUIVALENT.x, deltaTime)
          ) as Fraction,
          y: math.add(
            math.add(POSITION_CIRCLE_CENTER.y, math.subtract(math.multiply(math.subtract(0, COS_DETLA_THETA), R_CIRCLE.y), math.multiply(R_CIRCLE.x, SIN_DETLA_THETA))),
            math.multiply(V_EQUIVALENT.y, deltaTime)
          ) as Fraction
        },
        v: {
          x: math.add(
            math.subtract(math.multiply(V_CIRCLE.x, COS_DETLA_THETA), math.multiply(V_CIRCLE.y, SIN_DETLA_THETA)),
            V_EQUIVALENT.x
          ) as Fraction,
          y: math.add(
            math.add(math.multiply(V_CIRCLE.y, COS_DETLA_THETA), math.multiply(V_CIRCLE.x, SIN_DETLA_THETA)),
            V_EQUIVALENT.y
          ) as Fraction
        }
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      console.time('- particle' + String(i + 1))
      const particle = this.particles[i]
      particle.track = [] as ParticlePoint[]
      for (let simulateTime = 1; simulateTime <= simulateTimesBeforeTimeRange; simulateTime++) {
        const particleNextPoint = (isAccurate ? calculateParticleNextPointAccurate : calculateParticleNextPoint)({ field: this.field, particle, deltaTime: this.deltaTime, lastPoint: _particlesCurrentPoint[i] })
        _particlesCurrentPoint[i] = particleNextPoint
        this.#simulateProgress = simulateTime / simulateTimesBeforeTimeRangeEnd
      }
      if (simulateTimesBeforeTimeRange === 0) {
        particle.track.push(_particlesCurrentPoint[i])
      }
      for (let simulateTime = simulateTimesBeforeTimeRange + 1; simulateTime <= simulateTimesBeforeTimeRangeEnd; simulateTime++) {
        const particleNextPoint = (isAccurate ? calculateParticleNextPointAccurate : calculateParticleNextPoint)({ field: this.field, particle, deltaTime: this.deltaTime, lastPoint: particle.track.slice(-1)[0] ?? _particlesCurrentPoint[i] })
        particle.track.push(particleNextPoint)
        this.#simulateProgress = simulateTime / simulateTimesBeforeTimeRangeEnd
        console.log(this.#simulateProgress)
      }
      this.#simulateProgress = 1
      console.timeEnd('- particle' + String(i + 1))
    }

    this.#isSimulated = true
    this.#isSimulating = false
    this.#simulateProgress = NaN

    console.timeEnd('startSimulate')
  }

  getIsSimulated = (): boolean => this.#isSimulated
  getIsSimulating = (): boolean => this.#isSimulating
  getSimulateProgress = (): number => this.#isSimulating ? this.#simulateProgress : NaN

  getFieldArea = (): DeepReadonlyArray<FieldArea> => this.field.area
  getParticles = (): DeepReadonlyArray<Particle> => this.particles
}

export { Simulator }
