import { fireEvent, render, screen, within } from '@/test-utils';
import { TripsListElement } from './TripsListElement';

// Mock InfiniteScroll to simply render its children
jest.mock('react-infinite-scroll-component', () => {
  return function InfiniteScroll({
    children,
  }: {
    children: React.ReactNode;
    next: () => void;
    hasMore: boolean;
    loader: React.ReactNode;
    dataLength: number;
    style?: React.CSSProperties;
  }) {
    return <div data-testid="infinite-scroll">{children}</div>;
  };
});

// AppShell.Main and AppShell.Aside need an AppShell context – stub them
jest.mock('@mantine/core', () => {
  const actual = jest.requireActual('@mantine/core');
  return {
    ...actual,
    AppShell: {
      ...actual.AppShell,
      Main: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="appshell-main">{children}</div>
      ),
      Aside: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="appshell-aside">{children}</div>
      ),
    },
  };
});

describe('TripsListElement', () => {
  const defaultProps = {
    toggleTrip: jest.fn(),
    isTripToggled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<TripsListElement {...defaultProps} />);
    expect(screen.getByTestId('infinite-scroll')).toBeInTheDocument();
  });

  it('renders the first batch of trip posts', () => {
    render(<TripsListElement {...defaultProps} />);
    // mockTrips starts with 'Wycieczka poranna baaaardzo długa...'
    expect(
      screen.getAllByText(/Wycieczka poranna/i).length
    ).toBeGreaterThan(0);
  });

  it('calls toggleTrip when a trip is selected for the first time', () => {
    const toggleTrip = jest.fn();
    render(<TripsListElement toggleTrip={toggleTrip} isTripToggled={false} />);

    const firstTripTitle = screen.getAllByText(/Wycieczka poranna/i)[0];
    fireEvent.click(firstTripTitle);
    expect(toggleTrip).toHaveBeenCalled();
  });

  it('shows the TripDetails aside after selecting a trip', () => {
    render(<TripsListElement {...defaultProps} />);

    const occurrencesBeforeClick = screen.getAllByText(/Wycieczka poranna/i).length;
    const firstTitle = screen.getAllByText(/Wycieczka poranna/i)[0];
    fireEvent.click(firstTitle);

    // TripDetails in the aside renders the selected trip title in addition to the list item
    const occurrencesAfterClick = screen.getAllByText(/Wycieczka poranna/i).length;
    expect(occurrencesAfterClick).toBeGreaterThan(occurrencesBeforeClick);
  });

  it('closes the trip details when the close button in the aside is clicked', () => {
    const toggleTrip = jest.fn();
    render(<TripsListElement toggleTrip={toggleTrip} isTripToggled={false} />);

    // Select a trip first
    const firstTitle = screen.getAllByText(/Wycieczka poranna/i)[0];
    fireEvent.click(firstTitle);
    expect(toggleTrip).toHaveBeenCalledTimes(1);

    // Click the close button scoped to the aside container
    const aside = screen.getByTestId('appshell-aside');
    const closeButton = within(aside).getByRole('button');
    fireEvent.click(closeButton);

    expect(toggleTrip).toHaveBeenCalledTimes(2);
  });
});
