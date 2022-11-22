const events = require('../../../../src/utils/plotConfigInvalidation/events');

const invalidationResults = {
  [events.CELL_SETS_MODIFIED]: {
    embeddingCategoricalMain: [{
      id: 'embeddingCategoricalMain',
      config: {
        axes: {
          offset: 0, gridWidth: 10, xAxisText: 'Umap 1', yAxisText: 'Umap 2', domainWidth: 2, gridOpacity: 0, defaultValues: ['x', 'y'], labelFontSize: 12, titleFontSize: 13, xAxisRotateLabels: false,
        },
        spec: '1.0.0',
        title: {
          dx: 10, text: '', anchor: 'start', fontSize: 20,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: false },
        legend: { colour: '#000000', enabled: true, position: 'top' },
        marker: {
          size: 5, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        axesRanges: {
          xMax: 10, xMin: 0, yMax: 10, yMin: 0, xAxisAuto: true, yAxisAuto: true,
        },
        dimensions: { width: 700, height: 550 },
      },
    }],
    frequencyPlotMain: [{
      id: 'frequencyPlotMain',
      config: {
        axes: {
          offset: 10, gridWidth: 10, xAxisText: 'Sample', yAxisText: 'Proportion', domainWidth: 2, gridOpacity: 0, labelFontSize: 12, titleFontSize: 13, xAxisRotateLabels: true,
        },
        spec: '1.0.0',
        title: {
          dx: 10, text: '', anchor: 'start', fontSize: 15,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: true },
        legend: {
          title: 'Cell Set', colour: '#000000', offset: 40, enabled: true, position: 'top',
        },
        marker: {
          size: 5, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        axesRanges: { yMax: 10, yMin: 0, yAxisAuto: true },
        dimensions: { width: 500, height: 500 },
        axisTitlesize: 13,
        frequencyType: 'proportional',
        geneexpLegendloc: '',
      },
    }],
    embeddingContinuousMain: [{
      id: 'embeddingContinuousMain',
      config: {
        axes: {
          offset: 10, gridWidth: 10, xAxisText: 'Umap 1', yAxisText: 'Umap 2', domainWidth: 2, gridOpacity: 0, defaultValues: ['x', 'y'], labelFontSize: 12, titleFontSize: 13, xAxisRotateLabels: false,
        },
        spec: '1.0.0',
        title: {
          dx: 0, text: '', anchor: 'start', fontSize: 20,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: true },
        legend: { colour: '#000000', enabled: true, position: 'top-right' },
        marker: {
          size: 5, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        shownGene: 'Gzma',
        axesRanges: {
          xMax: 10, xMin: 0, yMax: 10, yMin: 0, xAxisAuto: true, yAxisAuto: true,
        },
        dimensions: { width: 700, height: 550 },
        logEquation: 'datum.expression*1',
        expressionValue: 'raw',
        truncatedValues: true,
        keepValuesOnReset: ['shownGene'],
      },
    }],
    markerHeatmapPlotMain: [{
      id: 'markerHeatmapPlotMain',
      config: {
        spec: '1.0.0',
        title: {
          dx: 0, text: '', anchor: 'start', fontSize: 20,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: true },
        legend: {
          show: true, colour: '#000000', enabled: true, position: 'horizontal',
        },
        marker: {
          size: 5, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        dimensions: { width: 500, height: 500 },
        guardLines: false,
        labelColour: 'transparent',
        nMarkerGenes: 5,
        selectedGenes: ['Ms4a4b', 'Smc4', 'Ccr7', 'Ifi27l2a', 'Gm8369', 'S100a4', 'S100a6', 'Tmem176a', 'Tmem176b', 'Cxcr6', '5830411N06Rik', 'Lmo4', 'Il18r1', 'Atp2b1', 'Pde5a', 'Ccl5', 'Nkg7', 'Klrd1', 'AW112010', 'Klrc1', 'Gzma', 'Stmn1', 'Hmgn2', 'Pclaf', 'Tuba1b', 'Lyz2', 'Ifitm3', 'Fcer1g', 'Tyrobp', 'Cst3', 'Cd74', 'Igkc', 'Cd79a', 'H2-Ab1', 'H2-Eb1'],
        showGeneLabels: true,
        useMarkerGenes: false,
        expressionValue: 'raw',
        truncatedValues: true,
        keepValuesOnReset: ['selectedGenes'],
      },
    }],
    'ViolinMain%': [{
      id: 'ViolinMain',
      config: {
        axes: {
          offset: 10, gridWidth: 10, xAxisText: '', yAxisText: '', domainWidth: 2, gridOpacity: 0, labelFontSize: 12, titleFontSize: 13, xAxisRotateLabels: true,
        },
        spec: '1.0.0',
        title: {
          dx: 0, text: 'Gzma', anchor: 'start', fontSize: 20,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: true },
        legend: { colour: '#000000', enabled: false, position: 'top' },
        marker: {
          size: 5, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        shownGene: 'Gzma',
        axesRanges: { yMax: 10, yMin: 0, yAxisAuto: true },
        dimensions: { width: 550, height: 400 },
        normalised: 'normalised',
        kdeBandwidth: 0.3,
        keepValuesOnReset: ['shownGene', 'title'],
        statisticsVisible: false,
        selectedPointsVisible: true,
      },
    }, {
      id: 'ViolinMain-0',
      config: {
        axes: {
          offset: 10, gridWidth: 10, xAxisText: '', yAxisText: '', domainWidth: 2, gridOpacity: 0, labelFontSize: 12, titleFontSize: 13, xAxisRotateLabels: true,
        },
        spec: '1.0.0',
        title: {
          dx: 0, text: 'Lyz2', anchor: 'start', fontSize: 20,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: true },
        legend: { colour: '#000000', enabled: false, position: 'top' },
        marker: {
          size: 5, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        shownGene: 'Lyz2',
        axesRanges: { yMax: 10, yMin: 0, yAxisAuto: true },
        dimensions: { width: 550, height: 400 },
        normalised: 'normalised',
        kdeBandwidth: 0.3,
        keepValuesOnReset: ['shownGene', 'title'],
        statisticsVisible: false,
        selectedPointsVisible: true,
      },
    }],
    dotPlotMain: [{
      id: 'dotPlotMain',
      config: {
        axes: {
          offset: 0, gridWidth: 10, xAxisText: 'Gene names', yAxisText: 'Louvain clusters', tickOffset: 10, domainWidth: 2, gridOpacity: 0, labelFontSize: 12, titleFontSize: 13, xAxisRotateLabels: true,
        },
        spec: '1.0.0',
        title: {
          dx: 0, text: '', anchor: 'start', fontSize: 20,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: true },
        legend: {
          colour: '#000000', enabled: true, position: 'right', direction: 'vertical',
        },
        marker: {
          size: 5, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        dimensions: { width: 700, height: 550 },
        nMarkerGenes: 3,
        selectedGenes: ['Apoe', 'Pclaf', 'Hmgb2'],
        useMarkerGenes: false,
        useAbsoluteScale: true,
        keepValuesOnReset: ['selectedGenes'],
      },
    }],
    'normalized-matrix': [{ id: 'normalized-matrix', config: {} }],
    heatmapPlotMain: [],
    volcanoPlotMain: [],
  },
  [events.EMBEDDING_MODIFIED]: {
    trajectoryAnalysisMain: [{
      id: 'trajectoryAnalysisMain',
      config: {
        axes: {
          offset: 0, gridWidth: 10, xAxisText: 'Umap 1', yAxisText: 'Umap 2', domainWidth: 2, gridOpacity: 0, defaultValues: ['x', 'y'], labelFontSize: 12, titleFontSize: 13, xAxisRotateLabels: false,
        },
        spec: '1.0.0',
        title: {
          dx: 10, text: '', anchor: 'start', fontSize: 20,
        },
        colour: {
          invert: 'standard', gradient: 'default', masterColour: '#000000', toggleInvert: '#FFFFFF', reverseColourBar: false,
        },
        labels: { size: 18, enabled: false },
        legend: { colour: '#000000', enabled: true, position: 'top' },
        marker: {
          size: 20, shape: 'circle', opacity: 5, showOpacity: true,
        },
        fontStyle: { font: 'sans-serif', colour: '#000000' },
        axesRanges: {
          xMax: 10, xMin: 0, yMax: 10, yMin: 0, xAxisAuto: true, yAxisAuto: true,
        },
        dimensions: { width: 700, height: 550 },
        selectedSample: 'All',
        selectedCellSet: 'louvain',
      },
    }],
  },
};

module.exports = invalidationResults;
