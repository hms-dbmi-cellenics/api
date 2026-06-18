// @ts-nocheck
const migration = require('../../../src/sql/migrations/20260601000000_add_xenium');

describe('20260601000000_add_xenium migration', () => {
  it('adds the xenium sample_technology enum value', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    await migration.up({ raw });

    expect(raw).toHaveBeenCalledWith("ALTER TYPE sample_technology ADD VALUE 'xenium';");
  });

  it('adds the three xenium sample_file_type enum values', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    await migration.up({ raw });

    expect(raw).toHaveBeenCalledWith("ALTER TYPE sample_file_type ADD VALUE 'xenium_cell_feature_matrix';");
    expect(raw).toHaveBeenCalledWith("ALTER TYPE sample_file_type ADD VALUE 'xenium_cells';");
    expect(raw).toHaveBeenCalledWith("ALTER TYPE sample_file_type ADD VALUE 'xenium_cell_boundaries';");
  });

  it('does not add an ome_zarr_zip / image file type for xenium (segmentations only)', async () => {
    const raw = jest.fn().mockResolvedValue(undefined);
    await migration.up({ raw });

    const statements = raw.mock.calls.map(([sql]) => sql);
    expect(statements).toHaveLength(4);
    expect(statements.some((sql) => sql.includes('ome_zarr_zip'))).toBe(false);
  });

  it('down is a no-op (ALTER TYPE ... ADD VALUE is not reversible)', async () => {
    await expect(migration.down()).resolves.not.toThrow();
  });
});
