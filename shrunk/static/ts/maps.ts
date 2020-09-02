import * as $ from 'jquery';

const US_MAP_URL =
    'https://code.highcharts.com/mapdata/countries/us/us-all.geo.json';

export async function get_us_map(): Promise<any> {
  let resp = await fetch(US_MAP_URL);
  return await resp.json();
}

const WORLD_MAP_URL =
    'https://code.highcharts.com/mapdata/custom/world.geo.json';

export async function get_world_map(): Promise<any> {
  let resp = await fetch(WORLD_MAP_URL);
  return await resp.json();
}
