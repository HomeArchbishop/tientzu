import { G, Svg, SVG } from '@svgdotjs/svg.js'
import { Simulator } from './Simulator'
import { DeepReadonly } from './util'

interface PrinterOptions {
  svgContainer: HTMLElement // prefer to be a div
  width?: number
  height?: number
}

interface PrintFuncIntrface {
  simulator: DeepReadonly<Simulator>
}

class Printer {
  constructor (printerOptions: PrinterOptions) {
    this.svgContainer = printerOptions.svgContainer
    while (this.svgContainer.firstChild !== null) {
      this.svgContainer.removeChild(this.svgContainer.firstChild)
    }
    if (typeof printerOptions.width === 'number') {
      if (printerOptions.width > 20) {
        this.width = printerOptions.width
      } else {
        throw new Error('Printer render size error: width too small, should be larger than 20px')
      }
    } else {
      this.width = 1000
    }
    if (typeof printerOptions.height === 'number') {
      if (printerOptions.height > 20) {
        this.height = printerOptions.height
      } else {
        throw new Error('Printer render size error: height too small, should be larger than 20px')
      }
    } else {
      this.height = 1000
    }
    this.svgContainer.style.width = `${this.width}px`
    this.svgContainer.style.height = `${this.height}px`

    this.draw = SVG().addTo(this.svgContainer)
    this.rootGroup = this.draw.group()
  }

  // One Printer instance is only within one svg (`this.draw`) and one root group (`this.rootGroup`),
  // while all the scales are handled by the root group (use `this.rootGroup.scale`)
  svgContainer: HTMLElement
  draw: Svg
  rootGroup: G

  width: number // svg container's width, also the <svg> size
  height: number // svg container's height, also the <svg> size

  #colors = {
    RED: '#c74440',
    BLUE: '#2d70b3',
    GREEN: '#388c46',
    PURPLE: '#6042a6',
    ORANGE: '#fa7e19',
    BLACK: '#000000'
  }

  print ({ simulator }: PrintFuncIntrface): void {
    if (!simulator.getIsSimulated()) {
      throw new Error('simulator does not simulated, please simulate it first')
    }

    const blankSpacePercentage = 0.02

    // work out basic data of the exhibition
    const trackPointBorderMap: Record<string, DeepReadonly<Record<'top' | 'bottom' | 'left' | 'right', number>>> = {}
    const trackPointBorderList: Array<DeepReadonly<Record<'top' | 'bottom' | 'left' | 'right', number>>> = []
    for (const particle of simulator.getParticles()) {
      const trackPointBorder = particle.getTrackPointBorder()
      trackPointBorderList.push(trackPointBorder)
      trackPointBorderMap[particle._id] = trackPointBorder
    }
    const trackPointBorderMax = { top: trackPointBorderList[0].top, bottom: trackPointBorderList[0].bottom, left: trackPointBorderList[0].left, right: trackPointBorderList[0].right }
    for (const border of trackPointBorderList.slice(1)) {
      if (trackPointBorderMax.bottom > border.bottom) { trackPointBorderMax.bottom = border.bottom }
      if (trackPointBorderMax.top < border.top) { trackPointBorderMax.top = border.top }
      if (trackPointBorderMax.left > border.left) { trackPointBorderMax.left = border.left }
      if (trackPointBorderMax.right < border.right) { trackPointBorderMax.right = border.right }
    }
    const displayPixelRange = { // 最大边界加上留白距离的四周参数
      top: trackPointBorderMax.top + (trackPointBorderMax.top - trackPointBorderMax.bottom) * blankSpacePercentage,
      bottom: trackPointBorderMax.bottom - (trackPointBorderMax.top - trackPointBorderMax.bottom) * blankSpacePercentage,
      left: trackPointBorderMax.left - (trackPointBorderMax.right - trackPointBorderMax.left) * blankSpacePercentage,
      right: trackPointBorderMax.right + (trackPointBorderMax.right - trackPointBorderMax.left) * blankSpacePercentage
    }
    const { width: renderWidth, height: rendeHeight } = this.svgContainer.getClientRects()[0] // to be customed
    const renderScale = Math.min(renderWidth / (displayPixelRange.right - displayPixelRange.left), rendeHeight / (displayPixelRange.top - displayPixelRange.bottom))
    displayPixelRange.left -= (renderWidth - (displayPixelRange.right - displayPixelRange.left) * renderScale) / renderScale / 2
    displayPixelRange.right += (renderWidth - (displayPixelRange.right - displayPixelRange.left) * renderScale) / renderScale
    displayPixelRange.bottom -= (rendeHeight - (displayPixelRange.top - displayPixelRange.bottom) * renderScale) / renderScale / 2
    displayPixelRange.top += (rendeHeight - (displayPixelRange.top - displayPixelRange.bottom) * renderScale) / renderScale
    // TODO 精度 & 溢出
    const _intervalRounder = (dotNum: number): number => Number((dotNum).toString().match(/[1-9]/)) * 10 ** ~~(Math.log10(dotNum) < 0 ? Math.log10(dotNum) - 1 : Math.log10(dotNum))
    const _intervalX = _intervalRounder((displayPixelRange.right - displayPixelRange.left) / 20)
    const _intervalY = _intervalRounder((displayPixelRange.top - displayPixelRange.bottom) / 20)
    // const _interval = Math.min(_intervalY, _intervalX)
    const axis = {
      x: {
        interval: _intervalX,
        start: ~~((displayPixelRange.left) / _intervalX) * _intervalX
      },
      y: {
        interval: _intervalY,
        start: ~~((displayPixelRange.bottom) / _intervalY) * _intervalY
      }
    }
    const fontSize: number = 6

    const $x = (x: number): number => x - displayPixelRange.left
    const $y = (y: number): number => displayPixelRange.top - y

    console.log(renderWidth, renderScale)
    console.table(trackPointBorderMax)
    console.table(displayPixelRange)
    console.table(axis)

    // create canvas
    this.draw.size(renderWidth, rendeHeight)

    // create canvas
    this.rootGroup.scale(renderScale, renderScale)

    // create CSYS
    const renderFontSize = fontSize / renderScale
    // axis-Y
    for (let x = axis.x.start; x <= displayPixelRange.right; x += axis.x.interval) {
      this.rootGroup.line($x(x), $y(displayPixelRange.top), $x(x), $y(displayPixelRange.bottom)).stroke({ width: 0.4 / renderScale, color: '#ddd' })
      this.rootGroup.text(`${x}`).font({ size: renderFontSize }).y($y(displayPixelRange.bottom + 1.5 * renderFontSize)).x($x(x))
    }
    // axis-X
    for (let y = axis.y.start; y <= displayPixelRange.top; y += axis.y.interval) {
      this.rootGroup.line($x(displayPixelRange.left), $y(y), $x(displayPixelRange.right), $y(y)).stroke({ width: 0.4 / renderScale, color: '#ddd' })
      this.rootGroup.text(`${y}`).font({ size: renderFontSize }).x($x(displayPixelRange.left)).y($y(y))
    }
    // dots
    for (let x = axis.x.start; x <= displayPixelRange.right; x += axis.x.interval) {
      for (let y = axis.y.start; y <= displayPixelRange.top; y += axis.y.interval) {
        const r = 1 / renderScale
        this.rootGroup.circle(2 * r).x($x(x - r)).y($y(y + r)).fill('#bbb')
      }
    }

    // draw particle paths
    for (let particleIdx = 0, particles = simulator.getParticles(); particleIdx < particles.length; particleIdx++) {
      const particle = particles[particleIdx]
      const color = Object.values(this.#colors)[particleIdx % Object.values(this.#colors).length]
      const numberTrack = particle.track.map(point => ({
        time: Number(point.time),
        position: { x: Number(point.position.x), y: Number(point.position.y) },
        v: { x: Number(point.v.x), y: Number(point.v.y) }
      }))
      let pathString: string = `M${$x(numberTrack[0].position.x)} ${$y(numberTrack[0].position.y)}`
      for (let i = 1; i < numberTrack.length; i++) {
        const point = numberTrack[i]
        pathString += ` L${$x(point.position.x)} ${$y(point.position.y)}`
      }
      this.rootGroup.path(pathString).stroke({ width: 0.5 / renderScale, color }).fill('none')
    }
  }
}

export { Printer }
