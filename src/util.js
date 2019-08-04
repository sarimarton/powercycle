import { castArray, get as _get, uniqueId } from './lodashpolyfills.js'
import { pragma, Fragment } from './reactpragma.js'
import { powercycle, CONFIG } from './powercycle.js'
import { collectSinksBasedOnSource } from './util/Collection.js'
import { makeCollection } from '@cycle/state'
import { resolve$Proxy } from './shortcuts.js'
import {
  isStreamCallback,
  resolveStreamCallback,
  wrapInStreamCallback
} from './dynamictypes.js'

// This is just a dummy component to serve as a lens or collection item
// container for a sub-vdom.
export function Scope (sources) {
  return pragma(Fragment, null, ...castArray(sources.props.children))
}

export function getConditionalCmp (cond$, children) {
  const conditionStateChannel = '$$$cond' + uniqueId()

  return sources => {
    const collection = makeCollection({
      item: sources => powercycle(
        pragma(Fragment, null, ...castArray(children)),
        null,
        sources
      ),
      itemScope: () => ({ '*': null }),
      channel: conditionStateChannel,
      collectSinks: collectSinksBasedOnSource(sources)
    })

    return collection({
      ...sources,
      [conditionStateChannel]: { stream: cond$.map(cond => cond ? [{}] : []) }
    })
  }
}

export function If (sources) {
  const cond$ = resolveStreamCallback(resolve$Proxy(sources.props.cond), sources)

  const thenVdom = sources.props.then || sources.props.children
  const elseVdom = sources.props.else

  return pragma(
    Fragment,
    null,
    getConditionalCmp(cond$, thenVdom),
    getConditionalCmp(cond$.map(cond => !cond), elseVdom)
  )
}

// Helper function to easily access state parts in the vdom.
// If src is provided, it'll use that as the sources object and return
// with a stream. If it's omitted, it will instead create an inline
// component
export const $map = (fn, streamOrCallbackOrProxy) => {
  const streamOrCallback = resolve$Proxy(streamOrCallbackOrProxy)

  return isStreamCallback(streamOrCallback)
    ? wrapInStreamCallback(src => map(fn, streamOrCallback(src)))
    : streamOrCallback // stream
      ? streamOrCallback.map(fn)
      : wrapInStreamCallback(src => map(fn, src.state.stream))
}

export const $get = (key, streamOrCallbackOrProxy) =>
  $map(
    streamVal => key
      ? _get(streamVal, key.split('.'))
      : streamVal,
    streamOrCallbackOrProxy
  )

export const $if = ($$cond, $then, $else) => {
  const $cond = resolve$Proxy($$cond)

  return isStreamCallback($cond)
    ? wrapInStreamCallback(
        src => $map(cond => cond ? $then : $else, $cond(src))
      )
    : $map(cond => cond ? $then : $else, $cond)
}

export const map = $map
export const get = $get
