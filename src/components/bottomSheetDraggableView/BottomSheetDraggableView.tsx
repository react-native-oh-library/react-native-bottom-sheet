import React, { useMemo, useRef, memo } from 'react';
import { PanResponder, Platform } from 'react-native';
import Animated, { runOnUI } from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import { BottomSheetDraggableContext } from '../../contexts/gesture';
import {
  useBottomSheetGestureHandlers,
  useBottomSheetInternal,
} from '../../hooks';
import { GESTURE_SOURCE, SHEET_STATE } from '../../constants';
import type { BottomSheetDraggableViewProps } from './types';

const BottomSheetDraggableViewComponent = ({
  gestureType = GESTURE_SOURCE.CONTENT,
  nativeGestureRef,
  refreshControlGestureRef,
  style,
  children,
  ...rest
}: BottomSheetDraggableViewProps) => {
  //#region hooks
  const {
    enableContentPanningGesture,
    simultaneousHandlers: _providedSimultaneousHandlers,
    waitFor,
    activeOffsetX,
    activeOffsetY,
    failOffsetX,
    failOffsetY,
    animatedSheetState,
  } = useBottomSheetInternal();
  const { contentPanGestureHandler, scrollablePanGestureHandler } =
    useBottomSheetGestureHandlers();
  const isHarmony = (Platform.OS as string) === 'harmony';
  const isContentPan = gestureType === GESTURE_SOURCE.CONTENT;
  const activePanHandlers = isContentPan
    ? contentPanGestureHandler
    : scrollablePanGestureHandler;
  //#endregion

  //#region variables
  const panGestureRef = useRef<PanGestureHandler>(null);
  const gestureHandler = useMemo(
    () => activePanHandlers.onGestureEvent,
    [activePanHandlers]
  );

  const simultaneousHandlers = useMemo(() => {
    const refs = [];

    if (nativeGestureRef) {
      refs.push(nativeGestureRef);
    }

    if (refreshControlGestureRef) {
      refs.push(refreshControlGestureRef);
    }

    if (_providedSimultaneousHandlers) {
      if (Array.isArray(_providedSimultaneousHandlers)) {
        refs.push(..._providedSimultaneousHandlers);
      } else {
        refs.push(_providedSimultaneousHandlers);
      }
    }

    return refs;
  }, [
    _providedSimultaneousHandlers,
    nativeGestureRef,
    refreshControlGestureRef,
  ]);

  const draggableGesture = useMemo(() => {
    let gesture = Gesture.Pan()
      .enabled(enableContentPanningGesture)
      .shouldCancelWhenOutside(false)
      .runOnJS(false)
      .onStart(contentPanGestureHandler.handleOnStart)
      .onChange(contentPanGestureHandler.handleOnChange)
      .onEnd(contentPanGestureHandler.handleOnEnd)
      .onFinalize(contentPanGestureHandler.handleOnFinalize);

    if (waitFor) {
      gesture = gesture.requireExternalGestureToFail(waitFor);
    }

    if (simultaneousHandlers) {
      gesture = gesture.simultaneousWithExternalGesture(
        simultaneousHandlers as never
      );
    }

    if (activeOffsetX) {
      gesture = gesture.activeOffsetX(activeOffsetX);
    }

    if (activeOffsetY) {
      gesture = gesture.activeOffsetY(activeOffsetY);
    }

    if (failOffsetX) {
      gesture = gesture.failOffsetX(failOffsetX);
    }

    if (failOffsetY) {
      gesture = gesture.failOffsetY(failOffsetY);
    }

    return gesture;
  }, [
    activeOffsetX,
    activeOffsetY,
    enableContentPanningGesture,
    failOffsetX,
    failOffsetY,
    simultaneousHandlers,
    waitFor,
    contentPanGestureHandler.handleOnChange,
    contentPanGestureHandler.handleOnEnd,
    contentPanGestureHandler.handleOnFinalize,
    contentPanGestureHandler.handleOnStart,
  ]);

  /**
   * Harmony: PanGestureHandler does not deliver CONTENT pan events reliably.
   * Use PanResponder (same approach as handle) for content-area sheet dragging.
   * When sheet is fully extended, yield to ScrollView scrolling.
   */
  const harmonyContentPanResponder = useMemo(() => {
    if (!isHarmony || !isContentPan || !enableContentPanningGesture) {
      return null;
    }

    const shouldPanSheet = () =>
      animatedSheetState.value !== SHEET_STATE.EXTENDED &&
      animatedSheetState.value !== SHEET_STATE.FILL_PARENT;

    const toGestureEvent = (gestureState: {
      dy: number;
      vy: number;
      moveY: number;
    }) => ({
      translationY: gestureState.dy,
      velocityY: gestureState.vy,
      absoluteY: gestureState.moveY,
    });

    const emitGestureEvent = (
      handler: typeof contentPanGestureHandler.handleOnChange,
      gestureState: { dy: number; vy: number; moveY: number }
    ) => {
      runOnUI(handler as never)(toGestureEvent(gestureState) as never);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => shouldPanSheet(),
      onMoveShouldSetPanResponder: () => shouldPanSheet(),
      onPanResponderGrant: (_, { y0 }) => {
        runOnUI(contentPanGestureHandler.handleOnStart as never)(
          {
            translationY: 0,
            velocityY: 0,
            absoluteY: y0,
          } as never
        );
      },
      onPanResponderMove: (_, gestureState) => {
        emitGestureEvent(
          contentPanGestureHandler.handleOnChange,
          gestureState
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        emitGestureEvent(contentPanGestureHandler.handleOnEnd as never, gestureState);
        runOnUI(contentPanGestureHandler.handleOnFinalize as never)(
          toGestureEvent(gestureState) as never
        );
      },
      onPanResponderTerminate: (_, gestureState) => {
        emitGestureEvent(contentPanGestureHandler.handleOnEnd as never, gestureState);
        runOnUI(contentPanGestureHandler.handleOnFinalize as never)(
          toGestureEvent(gestureState) as never
        );
      },
    });
  }, [
    isHarmony,
    isContentPan,
    enableContentPanningGesture,
    animatedSheetState,
    contentPanGestureHandler,
  ]);
  //#endregion

  if (isHarmony && !enableContentPanningGesture) {
    return (
      <Animated.View style={style} {...rest}>
        {children}
      </Animated.View>
    );
  }

  if (isHarmony && isContentPan) {
    return (
      <BottomSheetDraggableContext.Provider value={draggableGesture}>
        <Animated.View
          style={style}
          collapsable={false}
          {...rest}
          {...(harmonyContentPanResponder?.panHandlers ?? {})}>
          {children}
        </Animated.View>
      </BottomSheetDraggableContext.Provider>
    );
  }

  if (isHarmony) {
    return (
      <BottomSheetDraggableContext.Provider value={draggableGesture}>
        <PanGestureHandler
          ref={panGestureRef}
          enabled={enableContentPanningGesture}
          simultaneousHandlers={simultaneousHandlers as any}
          shouldCancelWhenOutside={false}
          waitFor={waitFor as any}
          onGestureEvent={gestureHandler}
          activeOffsetX={activeOffsetX}
          activeOffsetY={activeOffsetY}
          failOffsetX={failOffsetX}
          failOffsetY={failOffsetY}>
          <Animated.View style={style} {...rest}>
            {children}
          </Animated.View>
        </PanGestureHandler>
      </BottomSheetDraggableContext.Provider>
    );
  }

  return (
    <GestureDetector gesture={draggableGesture}>
      <BottomSheetDraggableContext.Provider value={draggableGesture}>
        <Animated.View style={style} {...rest}>
          {children}
        </Animated.View>
      </BottomSheetDraggableContext.Provider>
    </GestureDetector>
  );
};

const BottomSheetDraggableView = memo(BottomSheetDraggableViewComponent);
BottomSheetDraggableView.displayName = 'BottomSheetDraggableView';

export default BottomSheetDraggableView;
