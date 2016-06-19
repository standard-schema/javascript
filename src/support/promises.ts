import Promise = require('any-promise')
import { ValidationError } from './error'

/**
 * Try all promises and collect any failures.
 */
export function promiseEvery <T> (fns: Array<() => Promise<T>>): Promise<T[]> {
  let err: Error | void
  const results: any[] = new Array(fns.length)

  // Exit with empty length.
  if (fns.length === 0) {
    return Promise.resolve(results)
  }

  // Handle each of the functions, stopping on a non `ValidationError`.
  function handle (fn: () => Promise<any>, index: number) {
    return new Promise(resolve => resolve(fn()))
      .then(
        function (result) {
          results[index] = result

          return results
        },
        function (error) {
          if (!(error instanceof ValidationError)) {
            return Promise.reject(error)
          }

          err = error
        }
      )
  }

  // Execute every validation function, rejecting with the latest error.
  return fns.reduce(
    function (result, next, index) {
      return result.then(function () {
        return handle(next, index)
      })
    },
    Promise.resolve(results)
  ).then((res) => err ? Promise.reject(err) : res)
}
