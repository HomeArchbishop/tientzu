import { create, all } from 'mathjs'

export const math = create(all, {
  number: 'Fraction'
})

export const FRACTION_NEGATIVE_ONE = math.fraction(-1)

;(function activate () {
  console.time('mathjs activation')
  math.evaluate('1')
  math.fraction(1, 1)
  math.floor(1)
  math.ceil(1)
  math.sqrt(1)
  math.square(1)
  math.sin(1)
  math.cos(1)
  math.add(1, 1)
  math.subtract(1, 1)
  math.multiply(1, 1)
  math.divide(1, 1)
  math.number(1)
  math.smaller(1, 1)
  math.smallerEq(1, 1)
  math.equal(1, 1)
  math.chain(1).multiply(1).done()
  console.timeEnd('mathjs activation')
})()

export { Fraction } from 'mathjs'
