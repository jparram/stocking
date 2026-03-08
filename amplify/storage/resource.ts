import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'groceryAppStorage',
  access: allow => ({
    'share/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
  }),
});
