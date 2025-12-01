import Link from 'next/link';
import { Image, UnstyledButton } from '@mantine/core';
import classes from './Logo.module.css';

const Logo = ({
  src = '/favicon.svg',
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
    <Link href={href} passHref>
      <UnstyledButton component="a" className={classes.logoButton}>
        <Image
          src={src}
          alt="RegionRiders Logo"
          width={appliedWidth}
          height={appliedHeight}
          fit="contain"
          className={classes.logoImage}
        />
      </UnstyledButton>
    </Link>
  );
};

export { Logo };
