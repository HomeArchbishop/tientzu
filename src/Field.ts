import { math, Fraction } from './math'
import { uid } from 'uid'

interface FieldArea {
  _id: string
  border: {
    stringExpressionLatex: string
    judge: (x: Fraction, y: Fraction) => boolean
  }
  E: {
    val: (x: Fraction, y: Fraction, t: Fraction) => ({ x: Fraction, y: Fraction })
  }
  B: {
    val: (x: Fraction, y: Fraction, t: Fraction) => ({ z: Fraction })
  }
}

interface CreateFieldAreaOptions {
  border: string | false | ((x: string | number | Fraction, y: string | number | Fraction) => boolean)
  E: {
    x: string | number | Fraction
    y: string | number | Fraction
  } | ((x: number, y: number, t: number) => {
    x: string | number | Fraction
    y: string | number | Fraction
  })
  B: {
    z: string | number | Fraction
  } | ((x: number, y: number, t: number) => {
    z: string | number | Fraction
  })
}

class Field {
  area: FieldArea[] = []

  createFieldArea (createFieldAreaOptions: CreateFieldAreaOptions): string {
    if (typeof createFieldAreaOptions !== 'object') {
      throw new TypeError('createFieldAreaOptions is expected to be an object, but received ' + typeof createFieldAreaOptions)
    }
    const area: FieldArea = {
      _id: uid(16),
      border: {
        stringExpressionLatex: typeof createFieldAreaOptions.border === 'string'
          ? createFieldAreaOptions.border
          : createFieldAreaOptions.border !== false
            ? ''
            : '\\left|x\\right|>=0',
        judge: (x, y) => {
          if (createFieldAreaOptions.border === false) { return true }
          if (typeof createFieldAreaOptions.border === 'string') {
            return Boolean(math.evaluate(createFieldAreaOptions.border, { x, y }))
          }
          if (typeof createFieldAreaOptions.border === 'function') {
            return Boolean(createFieldAreaOptions.border(x, y))
          }
          throw new TypeError(
            'border option of field area is expected to be an object, number or function, but received' +
            typeof createFieldAreaOptions.border
          )
        }
      },
      E: {
        val: (x, y, t) => {
          if (typeof createFieldAreaOptions.E === 'function') {
            const EResult = createFieldAreaOptions.E(math.number(x), math.number(y), math.number(t))
            return { x: math.fraction(EResult.x), y: math.fraction(EResult.y) }
          }
          if (typeof createFieldAreaOptions.E === 'object') {
            return { x: math.fraction(createFieldAreaOptions.E.x), y: math.fraction(createFieldAreaOptions.E.y) }
          }
          throw new TypeError(
            'E option of field area is expected to be an object or function, but received' +
            typeof createFieldAreaOptions.E
          )
        }
      },
      B: {
        val: (x, y, t) => {
          if (typeof createFieldAreaOptions.B === 'function') {
            return { z: math.fraction(createFieldAreaOptions.B(math.number(x), math.number(y), math.number(t)).z) }
          }
          if (typeof createFieldAreaOptions.B === 'object') {
            return { z: math.fraction(createFieldAreaOptions.B.z) }
          }
          throw new TypeError(
            'B option of field area is expected to be an object or function, but received' +
            typeof createFieldAreaOptions.B
          )
        }
      }
    }
    this.area.push(area)
    return area._id
  }

  deleteFieldArea (_id: string): boolean {
    const targetFieldIdx = this.area.findIndex(field => field._id === _id)
    if (targetFieldIdx === -1) {
      return false
    }
    this.area.splice(targetFieldIdx, 1)
    return true
  }
}

export { Field }
export type { CreateFieldAreaOptions, FieldArea }
