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

import { ActivitiesListElement } from './ActivitiesListElement';

function renderInAppShell(ui: React.ReactNode) {
  return render(
    <Tabs defaultValue="activities">
      <AppShell aside={{ width: 300, breakpoint: 'sm' }}>{ui}</AppShell>
    </Tabs>
  );
}

describe('ActivitiesListElement', () => {
  it('renders without errors', () => {
    expect(() =>
      renderInAppShell(
        <ActivitiesListElement
          toggleActivity={jest.fn()}
          isActivityToggled={false}
          hideNavbar={jest.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders initial activities from mockData', () => {
    renderInAppShell(
      <ActivitiesListElement
        toggleActivity={jest.fn()}
        isActivityToggled={false}
        hideNavbar={jest.fn()}
      />
    );
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('calls toggleActivity when an activity is selected', async () => {
    const toggleActivity = jest.fn();
    renderInAppShell(
      <ActivitiesListElement
        toggleActivity={toggleActivity}
        isActivityToggled={false}
        hideNavbar={jest.fn()}
      />
    );

    const images = screen.getAllByRole('img');
    await userEvent.click(images[0]);

    expect(toggleActivity).toHaveBeenCalled();
  });

  it('renders close button in activity details after activity is selected', async () => {
    renderInAppShell(
      <ActivitiesListElement
        toggleActivity={jest.fn()}
        isActivityToggled={false}
        hideNavbar={jest.fn()}
      />
    );

    const images = screen.getAllByRole('img');
    await userEvent.click(images[0]);

    const closeButtons = screen.getAllByRole('button');
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('enters trip creation mode when "Create new trip" menu item is clicked', async () => {
    renderInAppShell(
      <ActivitiesListElement
        toggleActivity={jest.fn()}
        isActivityToggled={false}
        hideNavbar={jest.fn()}
      />
    );

    const menuTriggers = screen.getAllByText('\u2af6');
    await userEvent.click(menuTriggers[0]);

    const createTripItem = screen.getByText('Create new trip');
    await userEvent.click(createTripItem);

    expect(screen.getByRole('button', { name: /create trip/i })).toBeInTheDocument();
  });

  it('shows trip creation modal when "Create Trip" button is clicked with selected activities', async () => {
    renderInAppShell(
      <ActivitiesListElement
        toggleActivity={jest.fn()}
        isActivityToggled={false}
        hideNavbar={jest.fn()}
      />
    );

    const menuTriggers = screen.getAllByText('\u2af6');
    await userEvent.click(menuTriggers[0]);
    await userEvent.click(screen.getByText('Create new trip'));

    await userEvent.click(screen.getByRole('button', { name: /create trip/i }));

    expect(screen.getAllByText('Create Trip').length).toBeGreaterThan(0);
  });
});
