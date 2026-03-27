import { Navbar } from '@/components/Navbar/Navbar';
import {createTheme} from "@mantine/core";

const theme = createTheme({
  breakpoints: {
    xs: '30em',
    sm: '80em',
    md: '64em',
    lg: '74em',
    xl: '90em',
  },
}); // i think this might be needed but im too drunk rn to remember what is it for

export default function HomePage() {
  return (
    <>
      <Navbar/>
    </>
  );
}
