import { AppShell, Tabs } from '@mantine/core';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';

// Mock InfiniteScroll to render children directly
jest.mock('react-infinite-scroll-component', () => ({
  __esModule: true,
  default: ({
    children,
    loader,
  }: {
    children: React.ReactNode;
    loader: React.ReactNode;
    next: () => void;
    hasMore: boolean;
    dataLength: number;
    style?: React.CSSProperties;
  }) => (
    <>
      {children}
      {loader}
    </>
  ),
}));

jest.mock('@/lib/strava/oauth/getAuthUrl', () => ({
  getAuthorizationUrl: jest.fn().mockReturnValue(''),
}));
jest.mock('@/lib/strava/oauth/popup', () => ({
  openOAuthPopup: jest.fn(),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

import { TripsListElement } from './TripsListElement';

function renderInAppShell(ui: React.ReactNode) {
  return render(
    <Tabs defaultValue="trips">
      <AppShell aside={{ width: 300, breakpoint: 'sm' }}>
        {ui}
      </AppShell>
    </Tabs>
  );
}

describe('TripsListElement', () => {
  it('renders without errors', () => {
    expect(() =>
      renderInAppShell(<TripsListElement toggleTrip={jest.fn()} isTripToggled={false} />)
    ).not.toThrow();
  });

  it('renders initial trips from mockData', () => {
    renderInAppShell(<TripsListElement toggleTrip={jest.fn()} isTripToggled={false} />);
    // PostsList renders trip posts - trip titles should be present
    const titleElements = screen.getAllByText(/Wycieczka poranna/);
    expect(titleElements.length).toBeGreaterThan(0);
  });

  it('calls toggleTrip and shows trip details when a trip is selected', async () => {
    const toggleTrip = jest.fn();
    renderInAppShell(<TripsListElement toggleTrip={toggleTrip} isTripToggled={false} />);

    // Click first trip title
    const titles = screen.getAllByText(/Wycieczka poranna/);
    await userEvent.click(titles[0]);

    expect(toggleTrip).toHaveBeenCalled();
  });

  it('calls handleTripChange(null) when close button in TripDetails is clicked', async () => {
    const toggleTrip = jest.fn();
    renderInAppShell(<TripsListElement toggleTrip={toggleTrip} isTripToggled={false} />);

    // Select a trip first
    const titles = screen.getAllByText(/Wycieczka poranna/);
    await userEvent.click(titles[0]);

    // Now close the details pane
    const closeButtons = screen.getAllByRole('button');
    await userEvent.click(closeButtons[0]);

    // toggleTrip called once to open, once to close
    expect(toggleTrip).toHaveBeenCalledTimes(2);
  });

  it('renders the TripDetails close button after a trip is selected', async () => {
    renderInAppShell(<TripsListElement toggleTrip={jest.fn()} isTripToggled={false} />);

    const titles = screen.getAllByText(/Wycieczka poranna/);
    await userEvent.click(titles[0]);

    const closeButtons = screen.getAllByRole('button');
    expect(closeButtons.length).toBeGreaterThan(0);
  });
});
