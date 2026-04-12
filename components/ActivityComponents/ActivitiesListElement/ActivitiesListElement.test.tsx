import { mockActivities } from '@/lib/mockData';
import { fireEvent, render, screen } from '@/test-utils';
import { ActivitiesListElement } from './ActivitiesListElement';

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

describe('ActivitiesListElement', () => {
  const defaultProps = {
    toggleActivity: jest.fn(),
    isActivityToggled: false,
    hideNavbar: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<ActivitiesListElement {...defaultProps} />);
    expect(screen.getByTestId('infinite-scroll')).toBeInTheDocument();
  });

  it('renders the first batch of activities', () => {
    render(<ActivitiesListElement {...defaultProps} />);
    expect(screen.getAllByText(mockActivities[0].title).length).toBeGreaterThan(0);
  });

  it('calls toggleActivity when an activity title is clicked for the first time', () => {
    const toggleActivity = jest.fn();
    render(
      <ActivitiesListElement
        toggleActivity={toggleActivity}
        isActivityToggled={false}
        hideNavbar={jest.fn()}
      />
    );

    const firstActivityTitle = screen.getAllByText(mockActivities[0].title)[0];
    fireEvent.click(firstActivityTitle);
    expect(toggleActivity).toHaveBeenCalled();
  });

  it('opens trip creation mode when "Create new trip" is clicked in the menu', async () => {
    render(<ActivitiesListElement {...defaultProps} />);

    // Find the context menu trigger (⫶) — rendered as text inside an anchor
    const menuTriggers = screen.getAllByText('⫶');
    fireEvent.click(menuTriggers[0]);

    const createTripItem = await screen.findByText('Create new trip');
    fireEvent.click(createTripItem);

    // Trip creation mode is active: "Create Trip" button should appear
    expect(screen.getByRole('button', { name: /Create Trip/i })).toBeInTheDocument();
  });

  it('shows checkboxes in trip creation mode', async () => {
    render(<ActivitiesListElement {...defaultProps} />);

    const menuTriggers = screen.getAllByText('⫶');
    fireEvent.click(menuTriggers[0]);

    const createTripItem = await screen.findByText('Create new trip');
    fireEvent.click(createTripItem);

    // Checkboxes should now be rendered (hidden=false for them)
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });
});
