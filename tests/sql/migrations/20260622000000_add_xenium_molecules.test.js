// @ts-nocheck
const migration = require('../../../src/sql/migrations/20260622000000_add_xenium_molecules');

describe('20260622000000_add_xenium_molecules migration', () => {
  it('adds the xenium_transcripts and molecules_pyramid sample_file_type enum values', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    await migration.up({ raw });

    expect(raw).toHaveBeenCalledWith("ALTER TYPE sample_file_type ADD VALUE 'xenium_transcripts';");
    expect(raw).toHaveBeenCalledWith("ALTER TYPE sample_file_type ADD VALUE 'molecules_pyramid';");
  });

  it('only adds the two sample_file_type enum values', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    await migration.up({ raw });

    const statements = raw.mock.calls.map(([sql]) => sql);
    expect(statements).toHaveLength(2);
  });

  it('down is a no-op (ALTER TYPE ... ADD VALUE is not reversible)', async () => {
    await expect(migration.down()).resolves.not.toThrow();
  });
});
