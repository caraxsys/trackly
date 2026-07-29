export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  userAgent: string;
}

export type WebPushSupport =
  | { status: 'supported' }
  | {
      status: 'unsupported' | 'insecure' | 'missing-configuration';
      message: string;
    };

export type DeviceNotificationState =
  | 'checking'
  | 'unsupported'
  | 'insecure'
  | 'missing-configuration'
  | 'blocked'
  | 'disabled'
  | 'enabled';
