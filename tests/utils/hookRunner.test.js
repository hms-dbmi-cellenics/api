const HookRunner = require('../../src/utils/hooks/hookRunner');

describe('HookRunner', () => {
  it('initialize with an empty hooks list', () => {
    const runner = new HookRunner();

    expect(runner.hooks).toEqual({});
  });

  it('should register single hooks properly', () => {
    const testFn = () => true;

    const runner = new HookRunner();

    runner.register('test', testFn);
    runner.register('test', testFn);

    expect(Object.keys(runner.hooks).length).toEqual(1);
    expect(runner.hooks.test.length).toEqual(2);
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

    runner.register('event1', fn1);
    runner.register('event2', fn2);

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

    runner.register('event', fn1);
    runner.register('event', fn2);

    await runner.run({ taskName: 'event' });

    expect(runner.results.event).toEqual([fn1(), fn2()]);
  });
});
