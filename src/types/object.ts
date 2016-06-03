import { Rule } from './rule'
import { Any, AnyOptions } from './any'
import { promiseEvery } from '../support/promises'
import { TestFn, Context, CompiledFn, identity, NextFunction } from '../utils'

export interface ObjectOptions extends AnyOptions {
  properties?: ObjectProperties
  propertyTypes?: ObjectPropertyTypes
}

export interface ObjectProperties {
  [key: string]: Rule
}

export type ObjectPropertyTypes = Array<[Rule, Rule]>

export class Object extends Any implements ObjectOptions {

  type = 'Object'
  properties: ObjectProperties = {}
  propertyTypes: ObjectPropertyTypes = []

  constructor (options: ObjectOptions) {
    super(options)

    if (options.properties != null) {
      this.properties = options.properties
    }

    if (options.propertyTypes != null) {
      this.propertyTypes = options.propertyTypes
    }

    this._tests.push(isObject)
    this._tests.push(toPropertiesTest(this.properties, this.propertyTypes))
  }

  /**
   * Check if an object matches the schema structure.
   */
  _isType (object: any) {
    if (typeof object !== 'object') {
      return false
    }

    const keys = global.Object.keys(object)

    for (const key of keys) {
      const value = object[key]

      if (this.properties[key]) {
        return this.properties[key]._isType(value)
      }

      for (const [keyType, valueType] of this.propertyTypes) {
        if (keyType._isType(key)) {
          return valueType._isType(key)
        }
      }
    }
  }

}

/**
 * Validate the value is an object.
 */
function isObject (value: any, path: string[], context: Context, next: NextFunction<any>) {
  if (typeof value !== 'object') {
    throw context.error(path, 'Object', 'type', 'Object', value)
  }

  return next(value)
}

/**
 * Test all properties in an object definition.
 */
function toPropertiesTest (properties: ObjectProperties, propertyTypes: ObjectPropertyTypes): TestFn<any> {
  const propertyTypeTests = propertyTypes
    .map<[Rule, CompiledFn<any>, CompiledFn<any>]>(function (pair) {
      const [keyType, valueType] = pair

      return [keyType, keyType._compile(), valueType._compile()]
    })

  const propertyTests = global.Object.keys(properties)
    .map<[string, CompiledFn<any>]>(function (key) {
      return [key, properties[key]._compile()]
    })

  return function (object, path, context, next) {
    const keys = global.Object.keys(object)

    const properties = propertyTests.map(function ([key, test]) {
      return function () {
        return test(object[key], path.concat(key), context, identity)
          .then(value => [key, value])
      }
    })

    const types = propertyTypeTests.map(function ([keyType, keyTest, valueTest]) {
      return function () {
        for (const key of keys) {
          if (!keyType._isType(key)) {
            continue
          }

          return promiseEvery([
            () => keyTest(key, path.concat(key), context, identity),
            () => valueTest(object[key], path.concat(key), context, identity)
          ])
        }
      }
    })

    return promiseEvery(types.concat(properties))
      .then(pairs)
      .then(res => next(res))
  }
}

/**
 * Zip an array of pairs into an object.
 */
function pairs (pairs: Array<[string, any]>) {
  const result: any = {}

  for (const [key, value] of pairs) {
    if (typeof value !== 'undefined') {
      result[key] = value
    }
  }

  return result
}
