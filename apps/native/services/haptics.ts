import * as ExpoHaptics from "expo-haptics";
import { Platform } from "react-native";

const isNative = Platform.OS !== "web";

export const haptics = {
  light: () =>
    isNative ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light) : Promise.resolve(),
  medium: () =>
    isNative ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium) : Promise.resolve(),
  heavy: () =>
    isNative ? ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Heavy) : Promise.resolve(),
  success: () =>
    isNative
      ? ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success)
      : Promise.resolve(),
  error: () =>
    isNative
      ? ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Error)
      : Promise.resolve(),
};
