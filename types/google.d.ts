/**
 * Google Identity Services type definitions
 */

interface GoogleAccounts {
  id: {
    initialize: (config: {
      client_id: string;
      callback: (response: { credential: string }) => void;
    }) => void;
    renderButton: (
      element: HTMLElement,
      config: {
        theme?: "outline" | "filled_blue" | "filled_black";
        size?: "large" | "medium" | "small";
        type?: "standard" | "icon";
        text?: "signin_with" | "signup_with" | "continue_with" | "signin";
      }
    ) => void;
    prompt: (notification?: (notification: any) => void) => void;
  };
}

interface Window {
  google?: GoogleAccounts;
}
