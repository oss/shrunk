import { Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PieDatum } from '@/interfaces/link';

type ChartPieDatum = PieDatum & {
  configKey: string;
  fill: string;
};

interface props {
  data: ChartPieDatum[];
  chartConfig: ChartConfig;
}

export default function ShrunkPieChart({ data, chartConfig }: props) {
  return (
    <ChartContainer
      config={chartConfig}
      className="ph-0 mx-auto aspect-square max-h-[300px] [&_.recharts-pie-label-text]:fill-foreground"
    >
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent hideLabel nameKey="configKey" />}
        />
        <Pie data={data} dataKey="y" label nameKey="name" />
        <ChartLegend
          content={
            <ChartLegendContent
              nameKey="configKey"
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          }
        />
      </PieChart>
    </ChartContainer>
  );
}
