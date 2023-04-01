import Ajv, { JSONSchemaType } from 'ajv'

const ajv = new Ajv()

interface JSONInput {
  deltaTime: number
  timeRange: { from: number, to: number }
  fields: Array<{
    border: string
    E: { x: number, y: number }
    B: { z: number }
  }>
  particles: Array<{
    charge: number
    mass: number
    position: { x: number, y: number }
    v: { x: number, y: number }
  }>
}

const JSONInputSchema: JSONSchemaType<JSONInput> = {
  type: 'object',
  properties: {
    deltaTime: { type: 'number' },
    timeRange: {
      type: 'object',
      properties: {
        from: { type: 'number' },
        to: { type: 'number' }
      },
      required: ['from', 'to']
    },
    fields: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'object',
        properties: {
          border: { type: 'string' },
          E: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            },
            required: ['x', 'y']
          },
          B: {
            type: 'object',
            properties: {
              z: { type: 'number' }
            },
            required: ['z']
          }
        },
        required: ['B', 'E', 'border']
      }
    },
    particles: {
      type: 'array',
      uniqueItems: true,
      items: {
        type: 'object',
        properties: {
          charge: { type: 'number' },
          mass: { type: 'number' },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            },
            required: ['x', 'y']
          },
          v: {
            type: 'object',
            properties: {
              x: { type: 'number' },
              y: { type: 'number' }
            },
            required: ['x', 'y']
          }
        },
        required: ['charge', 'mass', 'position', 'v']
      }
    }
  },
  required: ['deltaTime', 'fields', 'particles', 'timeRange']
}

const validate = ajv.compile(JSONInputSchema)

export type { JSONInput }
export { validate as JSONInputValidate }
