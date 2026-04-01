import type { PropsWithChildren } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BOTTOM_OFFSET = 20;

type AuthFormScrollProps = PropsWithChildren<{
  /** Extra space below the last field when the keyboard is open (points). */
  bottomOffset?: number;
}>;

/**
 * Scroll container for auth flows: keeps focused inputs visible above the keyboard
 * on iOS and Android (via react-native-keyboard-controller).
 */
export function AuthFormScroll({ children, bottomOffset = BOTTOM_OFFSET }: AuthFormScrollProps) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Math.max(insets.bottom, 24);

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{ flexGrow: 1, paddingBottom }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bottomOffset={bottomOffset}
      nestedScrollEnabled
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
