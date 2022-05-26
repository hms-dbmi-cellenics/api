const HookRunner = require('../../../../../src/api.v2/helpers/pipeline/hooks/HookRunner');

describe('HookRunner', () => {
  it('initialize with an empty hooks list', () => {
    const runner = new HookRunner();

    expect(runner.hooks).toEqual({});
    expect(runner.results).toEqual({});
  });

  it('should fail when parameter is not a list', async () => {
    const runner = new HookRunner();

    expect(() => { runner.register('test', jest.fn()); }).toThrow();
  });

  it('should register array of hooks properly', () => {
    const testFn1 = () => true;
    const testFn2 = () => true;

    const runner = new HookRunner();

    runner.register('test', [testFn1, testFn2]);

    expect(Object.keys(runner.hooks).length).toEqual(1);
    expect(runner.hooks.test.length).toEqual(2);
  });

  it('should run hooks registered to the right event', async () => {
    const fn1 = () => 1;
    const fn2 = () => 2;

    const runner = new HookRunner();

    runner.register('event1', [fn1]);
    runner.register('event2', [fn2]);

    await runner.run({ taskName: 'event1' });
    expect(runner.results.event1).toEqual([fn1()]);

    await runner.run({ taskName: 'event2' });
    expect(runner.results.event2).toEqual([fn2()]);

    expect(Object.keys(runner.results).length).toEqual(2);
  });

  it('should run multiple hooks registered to the same action', async () => {
    const fn1 = () => 1;
    const fn2 = () => 2;

    const runner = new HookRunner();

    runner.register('event', [fn1]);
    runner.register('event', [fn2]);

    await runner.run({ taskName: 'event' });

    expect(runner.results.event).toEqual([fn1(), fn2()]);
  });

  it('should run multiple hooks with a global one', async () => {
    const event1Hook = jest.fn(() => 1);
    const hookOnEveryStep = jest.fn(() => 2);
    const event3Hook = jest.fn(() => 3);

    const runner = new HookRunner();

    runner.register('event1', [event1Hook]);
    runner.register('event2', [event3Hook]);
    runner.registerAll([hookOnEveryStep]);

    await runner.run({ taskName: 'event1' });
    await runner.run({ taskName: 'event2' });
    await runner.run({ taskName: 'event3' });

    expect(event1Hook).toHaveBeenCalledTimes(1);
    expect(hookOnEveryStep).toHaveBeenCalledTimes(3);
    expect(event3Hook).toHaveBeenCalledTimes(1);

    expect(runner.results.event1).toEqual([event1Hook(), hookOnEveryStep()]);
    expect(runner.results.event2).toEqual([event3Hook(), hookOnEveryStep()]);
    expect(runner.results.event3).toEqual([hookOnEveryStep()]);
  });


  it('should run multiple times a global hook', async () => {
    const fn1 = jest.fn(() => 1);

    const runner = new HookRunner();

    runner.registerAll([fn1]);

    await runner.run({ taskName: 'event-1' });
    await runner.run({ taskName: 'event-2' });
    await runner.run({ taskName: 'event-3' });

    expect(fn1).toHaveBeenCalledTimes(3);
    expect(runner.results['event-1']).toEqual([fn1()]);
    expect(runner.results['event-2']).toEqual([fn1()]);
    expect(runner.results['event-3']).toEqual([fn1()]);
  });

  it('does not crash when a hook throws an exception ', async () => {
    const fn1 = jest.fn(() => { throw new Error(); });

    const runner = new HookRunner();

    runner.registerAll([fn1]);

    await runner.run({ taskName: 'event-1' });

    expect(fn1).toHaveBeenCalledTimes(1);
    // functions that throw exceptions return an empty list
    expect(runner.results['event-1']).toEqual([]);
  });
});
