// type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T]

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>
}

type DeepReadonly<T> =
  T extends any[] ? DeepReadonlyArray<T[number]> :
    T extends Function ? T :
      T extends object ? DeepReadonlyObject<T> :
        T

export type { DeepReadonly, DeepReadonlyArray }
