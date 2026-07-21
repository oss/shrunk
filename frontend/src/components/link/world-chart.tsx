import { useId, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import unitedStatesData from '@/assets/maps/us-all.geo.json';
import worldData from '@/assets/maps/world.geo.json';
import { GeoipStats, MapDatum, StatMap } from '@/interfaces/link';

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = Position[][][];
type MultiLineStringCoordinates = Position[][];

type ProjectedGeometry =
  | { type: 'Polygon'; coordinates: PolygonCoordinates }
  | { type: 'MultiPolygon'; coordinates: MultiPolygonCoordinates }
  | { type: 'MultiLineString'; coordinates: MultiLineStringCoordinates };

type ProjectedFeature = {
  id?: string;
  properties: Record<string, string | number | null>;
  geometry: ProjectedGeometry;
};

type ProjectedFeatureCollection = {
  copyright?: string;
  copyrightUrl?: string;
  features: ProjectedFeature[];
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const unitedStatesMap =
  unitedStatesData as unknown as ProjectedFeatureCollection;
const worldMap = worldData as unknown as ProjectedFeatureCollection;

const mapChartConfig = {
  low: {
    label: 'Fewer visits',
    theme: { light: '#ffedd5', dark: '#7c2d12' },
  },
  high: {
    label: 'More visits',
    theme: { light: '#ea580c', dark: '#fb923c' },
  },
  empty: {
    label: 'No visits',
    theme: { light: '#e2e8f0', dark: '#334155' },
  },
} satisfies ChartConfig;

function visitColor(value: number, maximum: number): string {
  if (value <= 0) {
    return 'var(--color-empty)';
  }

  const ratio = maximum <= 1 ? 1 : Math.log(value) / Math.log(maximum);
  const lowPercentage = ((1 - ratio) * 100).toFixed(2);
  return `color-mix(in oklab, var(--color-low) ${lowPercentage}%, var(--color-high))`;
}

function forEachPosition(
  geometry: ProjectedGeometry,
  callback: (position: Position) => void,
): void {
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring) => ring.forEach(callback));
    return;
  }

  if (geometry.type === 'MultiLineString') {
    geometry.coordinates.forEach((line) => line.forEach(callback));
    return;
  }

  geometry.coordinates.forEach((polygon) =>
    polygon.forEach((ring) => ring.forEach(callback)),
  );
}

function getBounds(features: ProjectedFeature[]): Bounds {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  features.forEach((feature) => {
    forEachPosition(feature.geometry, ([x, y]) => {
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, -y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, -y);
    });
  });

  return bounds;
}

function ringToPath(ring: Position[]): string {
  return `${ring
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${-y}`)
    .join('')}Z`;
}

function geometryToPath(geometry: ProjectedGeometry): string {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ringToPath).join('');
  }

  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates
      .map((line) =>
        line
          .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${-y}`)
          .join(''),
      )
      .join('');
  }

  return geometry.coordinates
    .flatMap((polygon) => polygon.map(ringToPath))
    .join('');
}

function VisitsMap({
  map,
  joinProperty,
  data,
}: {
  map: ProjectedFeatureCollection;
  joinProperty: 'postal-code' | 'iso-a2';
  data: MapDatum[];
}) {
  const gradientId = `map-gradient-${useId().replace(/:/g, '')}`;
  const visitsByCode = useMemo(
    () => new Map(data.map((datum) => [datum.code.toUpperCase(), datum.value])),
    [data],
  );
  const maximum = Math.max(0, ...data.map((datum) => datum.value));
  const positiveValues = data
    .map((datum) => datum.value)
    .filter((value) => value > 0);
  const minimum = positiveValues.length ? Math.min(...positiveValues) : 0;
  const bounds = useMemo(() => getBounds(map.features), [map]);
  const paths = useMemo(
    () =>
      map.features.map((feature, index) => ({
        feature,
        key: feature.id ?? `map-line-${index}`,
        path: geometryToPath(feature.geometry),
      })),
    [map],
  );

  const spanX = bounds.maxX - bounds.minX;
  const spanY = bounds.maxY - bounds.minY;
  const padding = Math.max(spanX, spanY) * 0.025;
  const viewBox = `${bounds.minX - padding} ${bounds.minY - padding} ${spanX + padding * 2} ${spanY + padding * 2}`;
  const legendWidth = spanX * 0.18;
  const legendHeight = spanY * 0.025;
  const legendX = bounds.minX + padding;
  const legendY = bounds.maxY - padding - legendHeight;
  const labelSize = spanY * 0.025;

  return (
    <ChartContainer
      config={mapChartConfig}
      className="aspect-auto h-[clamp(18rem,50vw,32rem)] w-full"
    >
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Visits by geographic region"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-low)" />
            <stop offset="100%" stopColor="var(--color-high)" />
          </linearGradient>
        </defs>
        <g fillRule="evenodd">
          {paths.map(({ feature, key, path }) => {
            if (feature.geometry.type === 'MultiLineString') {
              return (
                <path
                  key={key}
                  d={path}
                  fill="none"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              );
            }

            const code = String(
              feature.properties[joinProperty] ?? '',
            ).toUpperCase();
            const name = String(feature.properties.name ?? code ?? 'Unknown');
            const visits = visitsByCode.get(code) ?? 0;
            const visitLabel = `${visits.toLocaleString()} ${visits === 1 ? 'visit' : 'visits'}`;

            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <path
                    d={path}
                    fill={visitColor(visits, maximum)}
                    stroke="hsl(var(--border))"
                    strokeWidth={0.75}
                    vectorEffect="non-scaling-stroke"
                    tabIndex={0}
                    aria-label={`${name}: ${visitLabel}`}
                    className="transition-[fill,stroke] outline-none hover:stroke-foreground focus:stroke-foreground"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-medium">{name}</span>: {visitLabel}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </g>
        <g aria-label={`Color scale from ${minimum} to ${maximum} visits`}>
          <rect
            x={legendX}
            y={legendY}
            width={legendWidth}
            height={legendHeight}
            rx={legendHeight / 4}
            fill={`url(#${gradientId})`}
          />
          <text
            x={legendX}
            y={legendY - labelSize * 0.35}
            fontSize={labelSize}
            fill="hsl(var(--foreground))"
          >
            {minimum.toLocaleString()}
          </text>
          <text
            x={legendX + legendWidth}
            y={legendY - labelSize * 0.35}
            textAnchor="end"
            fontSize={labelSize}
            fill="hsl(var(--foreground))"
          >
            {maximum.toLocaleString()}
          </text>
        </g>
        {maximum === 0 && (
          <text
            x={bounds.minX + spanX / 2}
            y={bounds.minY + spanY / 2}
            textAnchor="middle"
            fontSize={labelSize * 1.25}
            fontWeight="600"
            fill="hsl(var(--foreground))"
          >
            No visit data
          </text>
        )}
      </svg>
    </ChartContainer>
  );
}

export default function GeoipChart({ data }: { data?: GeoipStats }) {
  const [mapType, setMapType] = useState<StatMap>(StatMap.UnitedStates);

  if (!data) {
    return null;
  }

  const isUnitedStates = mapType === StatMap.UnitedStates;

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <Select
          value={mapType}
          onValueChange={(value: StatMap) => setMapType(value)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={StatMap.UnitedStates}>United States</SelectItem>
            <SelectItem value={StatMap.World}>World</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <TooltipProvider delayDuration={100}>
        {isUnitedStates ? (
          <VisitsMap
            joinProperty="postal-code"
            map={unitedStatesMap}
            data={data.us}
          />
        ) : (
          <VisitsMap joinProperty="iso-a2" map={worldMap} data={data.world} />
        )}
      </TooltipProvider>
      <p className="text-center text-xs text-muted-foreground">
        Map boundaries:{' '}
        <a
          href={
            isUnitedStates
              ? unitedStatesMap.copyrightUrl
              : worldMap.copyrightUrl
          }
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 hover:underline"
        >
          {isUnitedStates ? unitedStatesMap.copyright : worldMap.copyright}
        </a>
      </p>
    </div>
  );
}
