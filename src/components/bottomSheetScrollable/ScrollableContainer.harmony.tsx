import React, { forwardRef, useRef } from 'react';
import { NativeViewGestureHandler } from 'react-native-gesture-handler';
import BottomSheetDraggableView from '../bottomSheetDraggableView';
import { useBottomSheetInternal } from '../../hooks';
import { GESTURE_SOURCE } from '../../constants';
import { styles } from './styles';

/**
 * Harmony scrollables use NativeViewGestureHandler + scrollable pan handler,
 * matching bottom-sheet 4.6 OpenHarmony integration.
 */
// biome-ignore lint: to be addressed
export const ScrollableContainer = forwardRef<any, any>(
  function ScrollableContainer(
    {
      nativeGesture: _nativeGesture,
      refreshControl: _refreshControl,
      refreshing: _refreshing,
      progressViewOffset: _progressViewOffset,
      onRefresh: _onRefresh,
      ScrollableComponent,
      style,
      animatedProps,
      ...rest
    },
    ref
  ) {
    const nativeGestureRef = useRef<NativeViewGestureHandler>(null);
    const { enableContentPanningGesture } = useBottomSheetInternal();

    return (
      <BottomSheetDraggableView
        nativeGestureRef={nativeGestureRef}
        gestureType={GESTURE_SOURCE.SCROLLABLE}
        style={styles.container}
      >
        <NativeViewGestureHandler
          ref={nativeGestureRef}
          enabled={enableContentPanningGesture}
          shouldCancelWhenOutside={false}
        >
          <ScrollableComponent
            ref={ref}
            animatedProps={animatedProps}
            {...rest}
            style={[styles.container, style]}
          />
        </NativeViewGestureHandler>
      </BottomSheetDraggableView>
    );
  }
);
