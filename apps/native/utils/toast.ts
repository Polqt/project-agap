import { Alert, Platform, ToastAndroid } from "react-native";

export function showToastMessage(title: string, message?: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message ? `${title}: ${message}` : title, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(title, message);
}
