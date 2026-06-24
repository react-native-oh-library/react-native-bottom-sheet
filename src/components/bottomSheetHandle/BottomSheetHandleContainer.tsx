import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  PanResponder,
  Platform,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnUI } from 'react-native-reanimated';
import { ANIMATION_SOURCE } from '../../constants';
import {
  type BoundingClientRect,
  useBottomSheetGestureHandlers,
  useBottomSheetInternal,
  useBoundingClientRect,
} from '../../hooks';
import { print } from '../../utilities';
import { DEFAULT_ENABLE_HANDLE_PANNING_GESTURE } from '../bottomSheet/constants';
import BottomSheetHandle from './BottomSheetHandle';
import type { BottomSheetHandleContainerProps } from './types';

function snapPointJS(
  value: number,
  velocity: number,
  points: ReadonlyArray<number>
) {
  const point = value + 0.2 * velocity;
  let minDelta = Number.POSITIVE_INFINITY;
  let result = points[0];

  for (const snap of points) {
    const delta = Math.abs(point - snap);
    if (delta < minDelta) {
      minDelta = delta;
      result = snap;
    }
  }

  return result;
}

function BottomSheetHandleContainerComponent({
  animatedIndex,
  animatedPosition,
  simultaneousHandlers: _internalSimultaneousHandlers,
  enableHandlePanningGesture = DEFAULT_ENABLE_HANDLE_PANNING_GESTURE,
  enableOverDrag,
  enablePanDownToClose,
  overDragResistanceFactor,
  handleHeight,
  handleComponent,
  handleStyle: _providedHandleStyle,
  handleIndicatorStyle: _providedIndicatorStyle,
}: BottomSheetHandleContainerProps) {
  const ref = useRef<View>(null);
  const dragStartPosition = useRef(0);

  const {
    activeOffsetX,
    activeOffsetY,
    failOffsetX,
    failOffsetY,
    waitFor,
    simultaneousHandlers: _providedSimultaneousHandlers,
    animatedSnapPoints,
    animatedHighestSnapPoint,
    animatedClosedPosition,
    animatedContainerHeight,
    animateToPosition,
    stopAnimation,
  } = useBottomSheetInternal();
  const { handlePanGestureHandler } = useBottomSheetGestureHandlers();

  const simultaneousHandlers = useMemo<unknown[]>(() => {
    if (Platform.OS === 'harmony') {
      return [];
    }

    const refs = [];

    if (_internalSimultaneousHandlers) {
      refs.push(_internalSimultaneousHandlers);
    }

    if (_providedSimultaneousHandlers) {
      if (Array.isArray(_providedSimultaneousHandlers)) {
        refs.push(..._providedSimultaneousHandlers);
      } else {
        refs.push(_providedSimultaneousHandlers);
      }
    }

    return refs;
  }, [_providedSimultaneousHandlers, _internalSimultaneousHandlers]);

  const panGesture = useMemo(() => {
    let gesture = Gesture.Pan()
      .enabled(enableHandlePanningGesture)
      .shouldCancelWhenOutside(false)
      .runOnJS(false)
      .onStart(handlePanGestureHandler.handleOnStart)
      .onChange(handlePanGestureHandler.handleOnChange)
      .onEnd(handlePanGestureHandler.handleOnEnd)
      .onFinalize(handlePanGestureHandler.handleOnFinalize);

    if (waitFor) {
      gesture = gesture.requireExternalGestureToFail(waitFor);
    }

    if (simultaneousHandlers.length > 0) {
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
    enableHandlePanningGesture,
    failOffsetX,
    failOffsetY,
    simultaneousHandlers,
    waitFor,
    handlePanGestureHandler.handleOnChange,
    handlePanGestureHandler.handleOnEnd,
    handlePanGestureHandler.handleOnFinalize,
    handlePanGestureHandler.handleOnStart,
  ]);

  const handleContainerLayout = useCallback(
    function handleContainerLayout({
      nativeEvent: {
        layout: { height },
      },
    }: LayoutChangeEvent) {
      handleHeight.value = height;

      if (__DEV__) {
        print({
          component: BottomSheetHandleContainer.displayName,
          method: 'handleContainerLayout',
          category: 'layout',
          params: {
            height,
          },
        });
      }
    },
    [handleHeight]
  );

  const handleBoundingClientRect = useCallback(
    ({ height }: BoundingClientRect) => {
      handleHeight.value = height;
      if (__DEV__) {
        print({
          component: BottomSheetHandleContainer.displayName,
          method: 'handleBoundingClientRect',
          category: 'layout',
          params: {
            height,
          },
        });
      }
    },
    [handleHeight]
  );

  const harmonyPanResponder = useMemo(() => {
    if (Platform.OS !== 'harmony') {
      return null;
    }

    return PanResponder.create({
      onStartShouldSetPanResponder: () => enableHandlePanningGesture,
      onMoveShouldSetPanResponder: () => enableHandlePanningGesture,
      onPanResponderGrant: () => {
        dragStartPosition.current = animatedPosition.value;
        runOnUI(stopAnimation)();
      },
      onPanResponderMove: (_, { dy }) => {
        const highestSnapPoint = animatedHighestSnapPoint.value;
        const lowestSnapPoint = enablePanDownToClose
          ? animatedContainerHeight.value
          : animatedSnapPoints.value[0];
        let nextPosition = dragStartPosition.current + dy;

        if (nextPosition < highestSnapPoint) {
          if (enableOverDrag) {
            nextPosition =
              highestSnapPoint -
              Math.sqrt(1 + (highestSnapPoint - nextPosition)) *
                overDragResistanceFactor;
          } else {
            nextPosition = highestSnapPoint;
          }
        } else if (nextPosition > lowestSnapPoint) {
          if (enableOverDrag) {
            nextPosition =
              lowestSnapPoint +
              Math.sqrt(1 + (nextPosition - lowestSnapPoint)) *
                overDragResistanceFactor;
          } else {
            nextPosition = lowestSnapPoint;
          }
        }

        animatedPosition.value = nextPosition;
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        const snapPoints = animatedSnapPoints.value.slice();
        if (enablePanDownToClose) {
          snapPoints.unshift(animatedClosedPosition.value);
        }

        const destinationPoint = snapPointJS(
          dragStartPosition.current + dy,
          vy,
          snapPoints
        );

        runOnUI(animateToPosition)(
          destinationPoint,
          ANIMATION_SOURCE.GESTURE,
          vy / 2
        );
      },
    });
  }, [
    animateToPosition,
    animatedClosedPosition,
    animatedContainerHeight,
    animatedHighestSnapPoint,
    animatedPosition,
    animatedSnapPoints,
    enableHandlePanningGesture,
    enablePanDownToClose,
    enableOverDrag,
    overDragResistanceFactor,
    stopAnimation,
  ]);

  useBoundingClientRect(ref, handleBoundingClientRect);

  const HandleComponent = handleComponent ?? BottomSheetHandle;

  const handleContainerStyle =
    Platform.OS === 'harmony'
      ? { zIndex: 10, width: '100%' as const }
      : undefined;

  if (Platform.OS === 'harmony') {
    return (
      <View
        ref={ref}
        key="BottomSheetHandleContainer"
        collapsable={false}
        style={handleContainerStyle}
        onLayout={handleContainerLayout}
        {...(harmonyPanResponder?.panHandlers ?? {})}>
        <HandleComponent
          animatedIndex={animatedIndex}
          animatedPosition={animatedPosition}
          style={_providedHandleStyle}
          indicatorStyle={_providedIndicatorStyle}
        />
      </View>
    );
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        ref={ref}
        onLayout={handleContainerLayout}
        key="BottomSheetHandleContainer">
        <HandleComponent
          animatedIndex={animatedIndex}
          animatedPosition={animatedPosition}
          style={_providedHandleStyle}
          indicatorStyle={_providedIndicatorStyle}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const BottomSheetHandleContainer = memo(BottomSheetHandleContainerComponent);
BottomSheetHandleContainer.displayName = 'BottomSheetHandleContainer';

export default BottomSheetHandleContainer;
