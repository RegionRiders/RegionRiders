import { Global } from '@mantine/styles';

export function FontStyles() {
  return (
    <Global
      styles={{
        '@font-face': {
          fontFamily: 'W-droge',
          src: `
            url('/fonts/W-droge.woff') format('woff')
          `,
          fontWeight: 'normal',
          fontStyle: 'normal',
          fontDisplay: 'swap',
        },
      }}
    />
  );
}