import { Any, AnyOptions } from './any'
import { skipEmpty, Context } from '../utils'

const _toString = Object.prototype.toString

export interface DateOptions extends AnyOptions {

}

export class Date extends Any {

  type = 'date'

  constructor (options: DateOptions = {}) {
    super(options)

    this._tests.push(skipEmpty(isDate))
  }

}

function isDate (value: any, path: string[], context: Context): Date {
  if (_toString.call(value) !== '[object Date]') {
    throw context.error(path, 'type', 'date', value)
  }

  if (isNaN(value.getTime())) {
    throw context.error(path, 'type', 'date', value)
  }

  return value
}
