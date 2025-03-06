/**
 * Implement the [[ShrunkDatePicker]] component
 * @packageDocumentation
 */

import { DatePicker, DatePickerProps } from 'antd/lib';
import { RangePickerProps } from 'antd/lib/date-picker';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';
import React from 'react';

const defaultIcons = {
  suffixIcon: <CalendarIcon />,
  prevIcon: <ChevronLeftIcon />,
  nextIcon: <ChevronRightIcon />,
  superPrevIcon: <ChevronsLeftIcon />,
  superNextIcon: <ChevronsRightIcon />,
};

/**
 * Custom AntD RangePicker component
 */
const ShrunkRangePicker: React.FC<RangePickerProps> = (props) => (
  <DatePicker.RangePicker {...defaultIcons} {...props} /> // eslint-disable-line
);

/**
 * Custom AntD DatePicker component
 */
const ShrunkDatePicker: React.FC<DatePickerProps> & {
  RangePicker: React.FC<RangePickerProps>;
} = (props) => <DatePicker {...defaultIcons} {...props} />; // eslint-disable-line

ShrunkDatePicker.RangePicker = ShrunkRangePicker;

export default ShrunkDatePicker;
