const getCellSetsAffectingDownsampling = async (_experimentId, body, cellSets) => {
  // If not downsampling, then there's no dependency set by this getter
  if (!body.downsampleSettings) return '';

  const { selectedCellSet, groupedTracks } = body.downsampleSettings;

  const selectedCellSetKeys = cellSets
    .find(({ key }) => key === selectedCellSet)
    .children.map(({ key }) => key);

  const groupedCellSetKeys = cellSets
    .filter(({ key }) => groupedTracks.includes(key))
    .flatMap(({ children }) => children)
    .map(({ key }) => key);

  // Keep them in separate lists, they each represent different changes in the settings
  return [selectedCellSetKeys, groupedCellSetKeys];
};

module.exports = getCellSetsAffectingDownsampling;
