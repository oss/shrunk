import { Pie, PieChart } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/Components/ui/chart';
import { PieDatum } from '@/Interfaces/Link';

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
    <>
      <div aria-hidden="true">
        <ChartContainer
          config={chartConfig}
          className="ph-0 mx-auto aspect-square max-h-[300px] [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey="configKey" />}
            />
            <Pie
              data={data}
              dataKey="y"
              isAnimationActive={false}
              label={false}
              nameKey="name"
              rootTabIndex={-1}
            />
            <ChartLegend
              content={
                <ChartLegendContent
                  nameKey="configKey"
                  className="-translate-y-2 flex-wrap gap-2 bg-background text-foreground *:basis-1/4 *:justify-center [&>div]:text-foreground"
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </div>
      <div className="sr-only">
        <table>
          <caption>Link statistics by category</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Visits</th>
            </tr>
          </thead>
          <tbody>
            {data.map((datum) => (
              <tr key={datum.name}>
                <th scope="row">{datum.name}</th>
                <td>{datum.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
