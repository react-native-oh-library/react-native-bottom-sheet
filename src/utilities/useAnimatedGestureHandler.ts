import type { DependencyList } from 'react';
import { useCallback } from 'react';
import type {
  NativeEventWrapper,
  ReanimatedEvent,
} from 'react-native-reanimated';
import { useEvent, useHandler } from 'react-native-reanimated';

const EVENT_TYPE = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
} as const;

type StateType = (typeof EVENT_TYPE)[keyof typeof EVENT_TYPE];

type DefaultEvent = {
  nativeEvent: {
    readonly handlerTag: number;
    readonly numberOfPointers: number;
    readonly state: StateType;
    readonly x: number;
    readonly y: number;
    readonly absoluteX: number;
    readonly absoluteY: number;
    readonly translationX: number;
    readonly translationY: number;
    readonly velocityX: number;
    readonly velocityY: number;
  };
};

interface PropsUsedInUseAnimatedGestureHandler {
  handlerTag?: number;
  numberOfPointers?: number;
  state?: StateType;
  oldState?: StateType;
}

export type GestureHandlerEvent<Event extends object> =
  | ReanimatedEvent<Event>
  | Event;

type GestureHandler<
  Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler>,
  Context extends Record<string, unknown>,
> = (
  eventPayload: ReanimatedEvent<Event>,
  context: Context,
  isCanceledOrFailed?: boolean
) => void;

export interface GestureHandlers<
  Event extends NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler>,
  Context extends Record<string, unknown>,
> {
  [key: string]: GestureHandler<Event, Context> | undefined;
  onStart?: GestureHandler<Event, Context>;
  onActive?: GestureHandler<Event, Context>;
  onEnd?: GestureHandler<Event, Context>;
  onFail?: GestureHandler<Event, Context>;
  onCancel?: GestureHandler<Event, Context>;
  onFinish?: GestureHandler<Event, Context>;
}

/**
 * PanGestureHandler compatibility shim for Harmony, where Gesture.Native()
 * from bottom-sheet 5.x does not work with native scroll views.
 */
export function useAnimatedGestureHandler<
  Event extends
    NativeEventWrapper<PropsUsedInUseAnimatedGestureHandler> = DefaultEvent,
  Context extends Record<string, unknown> = Record<string, unknown>,
>(handlers: GestureHandlers<Event, Context>, dependencies?: DependencyList) {
  type WebOrNativeEvent = Event | ReanimatedEvent<Event>;

  const { context, doDependenciesDiffer, useWeb } = useHandler<Event, Context>(
    handlers,
    dependencies
  );

  const handler = useCallback(
    (e: WebOrNativeEvent) => {
      'worklet';
      const event = useWeb
        ? ((e as Event).nativeEvent as ReanimatedEvent<Event>)
        : (e as ReanimatedEvent<Event>);

      if (event.state === EVENT_TYPE.BEGAN && handlers.onStart) {
        handlers.onStart(event, context);
      }
      if (event.state === EVENT_TYPE.ACTIVE && handlers.onActive) {
        handlers.onActive(event, context);
      }
      if (
        event.oldState === EVENT_TYPE.ACTIVE &&
        event.state === EVENT_TYPE.END &&
        handlers.onEnd
      ) {
        handlers.onEnd(event, context);
      }
      if (
        event.oldState === EVENT_TYPE.BEGAN &&
        event.state === EVENT_TYPE.FAILED &&
        handlers.onFail
      ) {
        handlers.onFail(event, context);
      }
      if (
        event.oldState === EVENT_TYPE.ACTIVE &&
        event.state === EVENT_TYPE.CANCELLED &&
        handlers.onCancel
      ) {
        handlers.onCancel(event, context);
      }
      if (
        (event.oldState === EVENT_TYPE.BEGAN ||
          event.oldState === EVENT_TYPE.ACTIVE) &&
        event.state !== EVENT_TYPE.BEGAN &&
        event.state !== EVENT_TYPE.ACTIVE &&
        handlers.onFinish
      ) {
        handlers.onFinish(
          event,
          context,
          event.state === EVENT_TYPE.CANCELLED ||
            event.state === EVENT_TYPE.FAILED
        );
      }
    },
    [handlers, context, useWeb]
  );

  if (useWeb) {
    return handler;
  }

  return useEvent<Event>(
    handler,
    ['onGestureHandlerStateChange', 'onGestureHandlerEvent'],
    doDependenciesDiffer
  ) as unknown as (e: Event) => void;
}
