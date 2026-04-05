import { View, Heading, Text } from '@aws-amplify/ui-react';

/** Custom header rendered above the Amplify Authenticator sign-in/sign-up form. */
export function AuthHeader() {
  return (
    <View textAlign="center" padding="1.5rem 1rem 0.5rem">
      <Text fontSize="2rem" lineHeight="1">🛒</Text>
      <Heading level={3} style={{ color: '#004990', fontWeight: 700, marginTop: '0.25rem' }}>
        Stocking
      </Heading>
      <Text style={{ color: '#6C757D', fontSize: '0.875rem', marginTop: '0.25rem' }}>
        Family Grocery Tracker
      </Text>
    </View>
  );
}
