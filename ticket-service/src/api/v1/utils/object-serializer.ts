/************************************************

We are converting BigInt to String,
because JSON.stringify() throws an error
- no native support / direct serialization -

************************************************/

interface SerializerOptions {
  bigintAsString?: boolean
  dateAsISO?: boolean
}

type SerializedValue<T, Options extends SerializerOptions> = T extends bigint
  ? Options['bigintAsString'] extends false
    ? bigint
    : string
  : T extends Date
    ? Options['dateAsISO'] extends false
      ? Date
      : string
    : T

type SerializedObject<T, Options extends SerializerOptions> = {
  [K in keyof T]: SerializedValue<T[K], Options>
}

export function objectSerializer<
  /* eslint-disable @typescript-eslint/no-explicit-any */
  T extends Record<string, any>,
  Options extends SerializerOptions = { bigintAsString: true; dateAsISO: true },
>(
  obj: T,
  options?: Options,
): SerializedObject<T, Options extends undefined ? { bigintAsString: true; dateAsISO: true } : Options> {
  const { bigintAsString = true, dateAsISO = true } = options ?? {}
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const finalObject = {} as any

  Object.entries(obj).forEach(([key, value]) => {
    if (bigintAsString && typeof value === 'bigint') {
      finalObject[key] = value.toString()
    } else if (dateAsISO && value instanceof Date) {
      finalObject[key] = value.toISOString()
    } else {
      finalObject[key] = value
    }
  })

  return finalObject
}
