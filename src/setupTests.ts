let originalConsoleError: typeof console.error;

beforeAll(() => {
    originalConsoleError = console.error;
    console.error = (() => { }) as unknown as typeof console.error;
});

afterAll(() => {
    console.error = originalConsoleError;
});
