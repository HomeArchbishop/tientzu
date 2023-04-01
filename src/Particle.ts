import { math, Fraction } from './math'
import { DeepReadonly } from './util'
import { uid } from 'uid'

interface ParticlePoint {
  time: Fraction
  position: { x: Fraction, y: Fraction }
  v: { x: Fraction, y: Fraction }
}

interface ParticlePointInNumber {
  time: number
  position: { x: number, y: number }
  v: { x: number, y: number }
}

interface ParticleConstructorOptions {
  mass?: number | string | Fraction
  charge?: number | string | Fraction
  position?: {
    x?: number | string | Fraction
    y?: number | string | Fraction
  }
  v?: {
    x?: number | string | Fraction
    y?: number | string | Fraction
  }
}

class Particle {
  constructor (particleConstructorOptions?: ParticleConstructorOptions) {
    this.mass = math.fraction(particleConstructorOptions?.mass ?? 100)
    this.charge = math.fraction(particleConstructorOptions?.charge ?? 1)
    this.startingPoint = {
      time: math.fraction(0),
      position: { x: math.fraction(particleConstructorOptions?.position?.x ?? 0), y: math.fraction(particleConstructorOptions?.position?.y ?? 0) },
      v: { x: math.fraction(particleConstructorOptions?.v?.x ?? 1), y: math.fraction(particleConstructorOptions?.v?.y ?? 0) }
    }

    this._id = uid(16)
  }

  _id: string

  mass: Fraction
  charge: Fraction

  startingPoint: DeepReadonly<ParticlePoint>

  track: ParticlePoint[] = []

  getTrackPointByTime (_: { time: Fraction | number, inNumber: true }): DeepReadonly<ParticlePointInNumber>
  getTrackPointByTime (_: { time: Fraction | number, inNumber: false }): DeepReadonly<ParticlePoint>
  getTrackPointByTime ({ time, inNumber = false }: { time: Fraction | number, inNumber?: boolean }): DeepReadonly<ParticlePointInNumber | ParticlePoint> {
    if (this.track.length === 0) {
      throw new Error('partical does not have track, please simulate first')
    }
    const timeBegin: Fraction = this.track[0].time
    const timeEnd: Fraction = this.track.slice(-1)[0].time
    const timeTarget: Fraction = typeof time === 'number' ? math.fraction(time) : time
    if (math.smaller(timeTarget, timeBegin) as boolean || math.smaller(timeEnd, timeTarget) as boolean) {
      throw new Error('partical does not have point in time ' + String(time) + ', please reset time range and simulate again')
    }
    let pointBeforeTarget: ParticlePoint = this.track[0]
    for (const point of this.track) {
      if (math.equal(point.time, timeTarget) as boolean) {
        pointBeforeTarget = point
        break
      } else if (math.smaller(point.time, timeTarget) as boolean) {
        pointBeforeTarget = point
      } else /* if (math.smaller(timeTarget, point.time) as boolean) */ {
        break
      }
    }
    const targetTimeDelta = math.subtract(timeTarget, pointBeforeTarget.time)
    const targetPoint: DeepReadonly<ParticlePoint> = {
      time: timeTarget,
      position: {
        x: math.add(pointBeforeTarget.position.x, math.multiply(pointBeforeTarget.v.x, targetTimeDelta)) as Fraction,
        y: math.add(pointBeforeTarget.position.y, math.multiply(pointBeforeTarget.v.y, targetTimeDelta)) as Fraction
      },
      v: pointBeforeTarget.v
    }
    if (!inNumber) { return targetPoint }
    return {
      time: Number(targetPoint.time),
      position: {
        x: Number(targetPoint.position.x),
        y: Number(targetPoint.position.y)
      },
      v: {
        x: Number(targetPoint.v.x),
        y: Number(targetPoint.v.y)
      }
    }
  }

  getTrackPointBorder (): DeepReadonly<Record<'top' | 'bottom' | 'left' | 'right', number>> {
    if (this.track.length === 0) {
      throw new Error('partical does not have track, please simulate first')
    }
    let top: Fraction
    let bottom: Fraction
    let left: Fraction
    let right: Fraction
    top = bottom = this.track[0].position.y
    left = right = this.track[0].position.x

    for (const point of this.track) {
      if (math.smaller(point.position.x, left) as boolean) {
        left = point.position.x
      }
      if (math.smaller(right, point.position.x) as boolean) {
        right = point.position.x
      }
      if (math.smaller(top, point.position.y) as boolean) {
        top = point.position.y
      }
      if (math.smaller(point.position.y, bottom) as boolean) {
        bottom = point.position.y
      }
    }
    return {
      top: Number(top),
      bottom: Number(bottom),
      left: Number(left),
      right: Number(right)
    }
  }
}

export { Particle }
export type { ParticlePoint, ParticleConstructorOptions }
