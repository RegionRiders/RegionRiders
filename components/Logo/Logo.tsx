import Link from 'next/link';
import { Image, UnstyledButton } from '@mantine/core';

const Logo = ({
  src = 'https://http.cat/images/200.jpg',
  href = '/',
  width = undefined,
  height = undefined,
}: {
  src?: string;
  href?: string;
  width?: number;
  height?: number;
}) => {
  const appliedWidth = width ?? (height === undefined ? 50 : undefined);
  const appliedHeight = height ?? (width === undefined ? 50 : undefined);

  return (
    <UnstyledButton component={Link} href={href} target="_blank">
      <div style={{ padding: 'var(--mantine-spacing-md)' }}>
        <Image src={src} h={appliedHeight} w={appliedWidth} />
      </div>
    </UnstyledButton>
  );
};

export { Logo };
