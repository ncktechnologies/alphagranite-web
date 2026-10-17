import { useTheme } from 'next-themes';

/**
 * Chrome colors for ApexCharts. Apex writes these into SVG attributes, where
 * CSS variables don't resolve, so each theme gets literal values that mirror
 * the tokens in config.reui.css.
 */
export interface ChartColors {
  /** Card surface: segment gaps and marker rings */
  surface: string;
  axisLabel: string;
  grid: string;
  crosshair: string;
}

const LIGHT: ChartColors = {
  surface: '#FFFFFF',
  axisLabel: '#6F777B',
  grid: '#EEF0F2',
  crosshair: '#C9CDD4',
};

const DARK: ChartColors = {
  surface: '#171916',
  axisLabel: '#969D93',
  grid: '#262A24',
  crosshair: '#4A5046',
};

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === 'dark' ? DARK : LIGHT;
}
