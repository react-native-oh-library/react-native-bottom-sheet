import type { ReactNode } from 'react';
import type { ViewProps as RNViewProps } from 'react-native';
import type { GestureRef } from 'react-native-gesture-handler/lib/typescript/handlers/gestures/gesture';
import type { GESTURE_SOURCE } from '../../constants';

export type BottomSheetDraggableViewProps = RNViewProps & {
  gestureType?: GESTURE_SOURCE;
  nativeGestureRef?: Exclude<GestureRef, number>;
  refreshControlGestureRef?: Exclude<GestureRef, number>;
  children: ReactNode[] | ReactNode;
};
