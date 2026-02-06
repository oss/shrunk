import { ThemeConfig } from 'antd';
import { red } from '@ant-design/colors';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: red[6],
    colorLink: red[5],
    fontFamily: 'Geist',
  },
  components: {
    Table: {
      cellFontSize: 14,
    },
    Layout: {
      headerBg: red[6],
      headerColor: 'fff',
      footerBg: 'fff',
      siderBg: 'fff',
      bodyBg: 'fff',
    },
    Menu: {
      itemBg: 'fff',
      colorPrimaryHover: '#FFFFFF',
      colorPrimaryTextActive: '#FFFFFF',
      colorText: '#FFFFFF',
      colorPrimary: '#FFFFFF',
    },
    Tabs: {
      itemHoverColor: red[6],
      itemSelectedColor: red[6],
      itemActiveColor: red[6],
    },
  },
};

export const darkTheme: ThemeConfig = {};
