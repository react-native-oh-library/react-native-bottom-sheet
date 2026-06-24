import {
  type GestureStateChangeEvent,
  type GestureUpdateEvent,
  type PanGestureChangeEventPayload,
  type PanGestureHandlerEventPayload,
  State,
} from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { useWorkletCallback } from '../utilities/useWorkletCallback';
import { useAnimatedGestureHandler } from '../utilities/useAnimatedGestureHandler';
import { GESTURE_SOURCE } from '../constants';
import type {
  GestureEventHandlerCallbackType,
  GestureHandlersHookType,
} from '../types';

const resetContext = (context: Record<string, unknown>) => {
  'worklet';

  Object.keys(context).map(key => {
    context[key] = undefined;
  });
};

export const useGestureHandler: GestureHandlersHookType = (
  source: GESTURE_SOURCE,
  state: SharedValue<State>,
  gestureSource: SharedValue<GESTURE_SOURCE>,
  onStart: GestureEventHandlerCallbackType,
  onChange: GestureEventHandlerCallbackType,
  onEnd: GestureEventHandlerCallbackType,
  onFinalize: GestureEventHandlerCallbackType
) => {
  const handleOnStart = useWorkletCallback(
    (event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      'worklet';
      state.value = State.BEGAN;
      gestureSource.value = source;

      onStart(source, event);
      return;
    },
    [state, gestureSource, source, onStart]
  );

  const handleOnChange = useWorkletCallback(
    (
      event: GestureUpdateEvent<
        PanGestureHandlerEventPayload & PanGestureChangeEventPayload
      >
    ) => {
      'worklet';
      if (gestureSource.value !== source) {
        return;
      }

      state.value = event.state;
      onChange(source, event);
    },
    [state, gestureSource, source, onChange]
  );

  const handleOnEnd = useWorkletCallback(
    (event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      'worklet';
      if (gestureSource.value !== source) {
        return;
      }

      state.value = event.state;
      gestureSource.value = GESTURE_SOURCE.UNDETERMINED;

      onEnd(source, event);
    },
    [state, gestureSource, source, onEnd]
  );

  const handleOnFinalize = useWorkletCallback(
    (event: GestureStateChangeEvent<PanGestureHandlerEventPayload>) => {
      'worklet';
      if (gestureSource.value !== source) {
        return;
      }

      state.value = event.state;
      gestureSource.value = GESTURE_SOURCE.UNDETERMINED;

      onFinalize(source, event);
    },
    [state, gestureSource, source, onFinalize]
  );

  const onActive = useWorkletCallback(
    (event: GestureUpdateEvent<PanGestureHandlerEventPayload>, context: Record<string, unknown>) => {
      'worklet';
      if (!context.didStart) {
        context.didStart = true;
        state.value = State.BEGAN;
        gestureSource.value = source;
        onStart(source, event);
        return;
      }

      if (gestureSource.value !== source) {
        return;
      }

      state.value = event.state;
      onChange(source, event);
    },
    [state, gestureSource, source, onStart, onChange]
  );

  const onActiveEnd = useWorkletCallback(
    (event: GestureStateChangeEvent<PanGestureHandlerEventPayload>, context: Record<string, unknown>) => {
      'worklet';
      if (gestureSource.value !== source) {
        return;
      }

      state.value = event.state;
      gestureSource.value = GESTURE_SOURCE.UNDETERMINED;
      onEnd(source, event);
      resetContext(context);
    },
    [state, gestureSource, source, onEnd]
  );

  const onActiveFinish = useWorkletCallback(
    (event: GestureStateChangeEvent<PanGestureHandlerEventPayload>, context: Record<string, unknown>) => {
      'worklet';
      if (gestureSource.value !== source) {
        return;
      }

      state.value = event.state;
      gestureSource.value = GESTURE_SOURCE.UNDETERMINED;
      onFinalize(source, event);
      resetContext(context);
    },
    [state, gestureSource, source, onFinalize]
  );

  const onGestureEvent = useAnimatedGestureHandler(
    {
      onActive,
      onEnd: onActiveEnd,
      onCancel: onActiveEnd,
      onFail: onActiveEnd,
      onFinish: onActiveFinish,
    },
    [onActive, onActiveEnd, onActiveFinish]
  );

  return {
    handleOnStart,
    handleOnChange,
    handleOnEnd,
    handleOnFinalize,
    onGestureEvent,
  } as ReturnType<GestureHandlersHookType>;
};
