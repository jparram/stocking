import { createTheme } from '@aws-amplify/ui-react';

/**
 * Custom Amplify UI theme matching Stocking's design language.
 *
 * Brand palette (from tailwind.config.js):
 *   sams blue:   #004990  (dark: #003366, light: #E8F0FA)
 *   brand-text:  #212529
 *   brand-muted: #6C757D
 *   brand-bg:    #F8F9FA
 *   brand-card:  #FFFFFF
 *   brand-border:#DEE2E6
 */
export const stockingTheme = createTheme({
  name: 'stocking-theme',
  tokens: {
    fonts: {
      default: {
        variable: { value: '"Inter", system-ui, sans-serif' },
        static: { value: '"Inter", system-ui, sans-serif' },
      },
    },
    colors: {
      background: {
        primary: { value: '#FFFFFF' },
        secondary: { value: '#F8F9FA' },
      },
      font: {
        primary: { value: '#212529' },
        secondary: { value: '#6C757D' },
        interactive: { value: '#004990' },
      },
      border: {
        primary: { value: '#DEE2E6' },
        secondary: { value: '#DEE2E6' },
        focus: { value: '#004990' },
      },
      brand: {
        primary: {
          10: { value: '#E8F0FA' },
          20: { value: '#c8d8f0' },
          40: { value: '#99b5e0' },
          60: { value: '#5a86c8' },
          80: { value: '#004990' },
          90: { value: '#003a73' },
          100: { value: '#003366' },
        },
      },
    },
    radii: {
      small: { value: '0.375rem' },
      medium: { value: '0.5rem' },
      large: { value: '0.75rem' },
      xl: { value: '0.75rem' },
      xxl: { value: '1rem' },
    },
    space: {
      small: { value: '0.75rem' },
      medium: { value: '1rem' },
      large: { value: '1.5rem' },
    },
    fontSizes: {
      small: { value: '0.875rem' },
      medium: { value: '1rem' },
      large: { value: '1.125rem' },
    },
    fontWeights: {
      normal: { value: '400' },
      medium: { value: '500' },
      semibold: { value: '600' },
      bold: { value: '700' },
    },
    components: {
      authenticator: {
        router: {
          borderWidth: { value: '1px' },
          borderStyle: { value: 'solid' },
          borderColor: { value: '#DEE2E6' },
          boxShadow: { value: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)' },
        },
        container: {
          widthMax: { value: '420px' },
        },
      },
      button: {
        primary: {
          backgroundColor: { value: '#004990' },
          color: { value: '#FFFFFF' },
          borderColor: { value: '#004990' },
          _hover: {
            backgroundColor: { value: '#003a73' },
            borderColor: { value: '#003a73' },
          },
          _focus: {
            backgroundColor: { value: '#003a73' },
            borderColor: { value: '#003a73' },
            boxShadow: { value: '0 0 0 3px rgb(0 73 144 / 0.25)' },
          },
          _active: {
            backgroundColor: { value: '#003366' },
            borderColor: { value: '#003366' },
          },
        },
        link: {
          color: { value: '#004990' },
          _hover: {
            color: { value: '#003366' },
            backgroundColor: { value: 'transparent' },
          },
        },
      },
      fieldcontrol: {
        borderColor: { value: '#DEE2E6' },
        borderRadius: { value: '0.5rem' },
        color: { value: '#212529' },
        _focus: {
          borderColor: { value: '#004990' },
          boxShadow: { value: '0 0 0 3px rgb(0 73 144 / 0.15)' },
        },
      },
      tabs: {
        item: {
          color: { value: '#6C757D' },
          _active: {
            color: { value: '#004990' },
            borderColor: { value: '#004990' },
          },
          _hover: {
            color: { value: '#004990' },
          },
          _focus: {
            color: { value: '#004990' },
          },
        },
      },
    },
  },
});
